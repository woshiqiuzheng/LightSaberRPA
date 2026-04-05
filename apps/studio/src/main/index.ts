import type { FlowDefinition } from "@lightsaber-rpa/flow-core";
import {
  executeFlow,
  type RunnerEvent,
  type RunnerExecuteFlowRequest
} from "@lightsaber-rpa/runner";
import { app, BrowserWindow, ipcMain } from "electron";
import { watch, type FSWatcher } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyRunnerEventToRunHistory,
  type StudioRunHistoryRecord
} from "../shared/run-history.js";

const currentDir = fileURLToPath(new URL(".", import.meta.url));
const workspaceStateFileName = "workspace-state.json";
const runHistoryFileName = "run-history.json";
const runEventChannel = "studio:run:event";
const fileTriggerDebounceMs = 250;

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

const activeFileTriggers = new Map<string, RegisteredFileTrigger>();
let latestWorkspaceSnapshot: StudioWorkspaceSnapshot | null = null;
let persistedRunHistory: StudioRunHistoryRecord[] = [];
let runHistoryWriteChain = Promise.resolve();

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1280,
    minHeight: 820,
    title: "LightSaberRPA Studio",
    backgroundColor: "#f5f7fb",
    show: false,
    webPreferences: {
      preload: join(currentDir, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
    return mainWindow;
  }

  mainWindow.loadFile(join(currentDir, "../renderer/index.html"));
  return mainWindow;
}

void app.whenReady().then(async () => {
  ipcMain.handle("studio:ping", () => ({ ok: true, timestamp: Date.now() }));
  ipcMain.handle("studio:workspace-state:load", async () => {
    const snapshot = await loadPersistedWorkspaceState();
    latestWorkspaceSnapshot = snapshot;
    syncFileTriggers(snapshot);
    return snapshot;
  });
  ipcMain.handle("studio:run-history:list", async () => persistedRunHistory);
  ipcMain.handle("studio:workspace-state:save", async (_event, workspaceState: unknown) => {
    const workspaceStatePath = getWorkspaceStatePath();
    const serializedState = JSON.stringify(workspaceState, null, 2);

    await writeFile(workspaceStatePath, serializedState, "utf8");
    latestWorkspaceSnapshot = isStudioWorkspaceSnapshot(workspaceState) ? workspaceState : null;
    syncFileTriggers(latestWorkspaceSnapshot);

    return {
      ok: true as const,
      path: workspaceStatePath,
      timestamp: Date.now()
    };
  });
  ipcMain.handle("studio:run:execute", async (event, request: RunnerExecuteFlowRequest) => {
    const targetWindow = BrowserWindow.fromWebContents(event.sender);

    if (!targetWindow) {
      throw new Error("Unable to resolve the target Studio window.");
    }

    void executeFlow(request, {
      onEvent: (runnerEvent) => {
        recordRunnerEvent(runnerEvent);
        dispatchRunEvent(targetWindow, runnerEvent);
      }
    });

    return {
      ok: true as const,
      startedAt: Date.now()
    };
  });

  createWindow();
  latestWorkspaceSnapshot = await loadPersistedWorkspaceState();
  persistedRunHistory = await loadPersistedRunHistory();
  syncFileTriggers(latestWorkspaceSnapshot);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("before-quit", () => {
  syncFileTriggers(null);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function dispatchRunEvent(targetWindow: BrowserWindow, runnerEvent: RunnerEvent) {
  if (!targetWindow.isDestroyed()) {
    targetWindow.webContents.send(runEventChannel, runnerEvent);
  }
}

function dispatchRunEventToAllWindows(runnerEvent: RunnerEvent) {
  for (const targetWindow of BrowserWindow.getAllWindows()) {
    dispatchRunEvent(targetWindow, runnerEvent);
  }
}

async function loadPersistedWorkspaceState() {
  const workspaceStatePath = getWorkspaceStatePath();

  try {
    const fileContents = stripLeadingByteOrderMark(await readFile(workspaceStatePath, "utf8"));
    const parsed = JSON.parse(fileContents) as unknown;
    return isStudioWorkspaceSnapshot(parsed) ? parsed : null;
  } catch (error) {
    if (isMissingFileError(error)) {
      return null;
    }

    throw error;
  }
}

async function loadPersistedRunHistory() {
  const runHistoryPath = getRunHistoryPath();

  try {
    const fileContents = stripLeadingByteOrderMark(await readFile(runHistoryPath, "utf8"));
    const parsed = JSON.parse(fileContents) as unknown;
    return Array.isArray(parsed) ? (parsed as StudioRunHistoryRecord[]) : [];
  } catch (error) {
    if (isMissingFileError(error)) {
      return [];
    }

    console.warn("[run-history] Failed to load persisted run history:", error);
    return [];
  }
}

function syncFileTriggers(snapshot: StudioWorkspaceSnapshot | null) {
  const nextBindings = snapshot ? deriveFileTriggerBindings(snapshot) : [];
  const nextBindingMap = new Map(nextBindings.map((binding) => [binding.taskId, binding]));

  for (const [taskId, registration] of activeFileTriggers) {
    const nextBinding = nextBindingMap.get(taskId);

    if (!nextBinding || !isSameBinding(registration, nextBinding)) {
      disposeFileTrigger(registration);
      activeFileTriggers.delete(taskId);
    }
  }

  for (const binding of nextBindings) {
    const existing = activeFileTriggers.get(binding.taskId);

    if (existing) {
      continue;
    }

    const registration = registerFileTrigger(binding);

    if (registration) {
      activeFileTriggers.set(binding.taskId, registration);
    }
  }
}

function deriveFileTriggerBindings(snapshot: StudioWorkspaceSnapshot): FileTriggerBinding[] {
  const appRecordsById = new Map(
    snapshot.appRecords.map((record) => [record.app.id, record])
  );

  return snapshot.taskRecords.flatMap((task) => {
    if (!task.enabled || task.trigger !== "File trigger") {
      return [];
    }

    const directory = task.config?.directory?.trim();
    const appRecord = appRecordsById.get(task.appId);

    if (!directory || !appRecord?.flow) {
      return [];
    }

    return [
      {
        taskId: task.id,
        taskName: task.name,
        flow: appRecord.flow,
        directory,
        recursive: task.config?.recursive ?? false,
        filePattern: task.config?.filePattern?.trim() || "*",
        eventTypes: normalizeFileEventTypes(task.config?.eventTypes)
      }
    ];
  });
}

function registerFileTrigger(binding: FileTriggerBinding) {
  const registration: RegisteredFileTrigger = {
    ...binding,
    watcher: undefined as unknown as FSWatcher,
    debounceTimer: null,
    isRunning: false,
    rerunRequested: false,
    pendingFileName: null
  };

  try {
    const watcher = watch(
      binding.directory,
      {
        recursive: binding.recursive
      },
      (eventType, fileName) => {
        scheduleFileTriggerRun(registration, eventType, fileName);
      }
    );

    registration.watcher = watcher;
    console.info(
      `[file-trigger:${registration.taskId}] Watching ${registration.directory} (${registration.filePattern}) for ${registration.taskName}`
    );
    watcher.on("error", (error) => {
      console.warn(
        `[file-trigger:${registration.taskId}] Watcher error for ${registration.directory}:`,
        error
      );
    });

    return registration;
  } catch (error) {
    console.warn(
      `[file-trigger:${binding.taskId}] Failed to watch ${binding.directory}:`,
      error
    );
    return null;
  }
}

function scheduleFileTriggerRun(
  registration: RegisteredFileTrigger,
  eventType: string,
  fileName: string | Buffer | null
) {
  const normalizedEventType = normalizeFileEventType(eventType);

  if (!normalizedEventType || !registration.eventTypes.includes(normalizedEventType)) {
    return;
  }

  const relativeFileName = normalizeWatchFileName(fileName);

  if (relativeFileName && !matchesFilePattern(relativeFileName, registration.filePattern)) {
    return;
  }

  registration.pendingFileName = relativeFileName;

  if (registration.debounceTimer) {
    clearTimeout(registration.debounceTimer);
  }

  registration.debounceTimer = setTimeout(() => {
    registration.debounceTimer = null;
    void runFileTrigger(registration);
  }, fileTriggerDebounceMs);
}

async function runFileTrigger(registration: RegisteredFileTrigger) {
  if (registration.isRunning) {
    registration.rerunRequested = true;
    return;
  }

  registration.isRunning = true;
  const pendingFileName = registration.pendingFileName;
  registration.pendingFileName = null;

  try {
    console.info(
      `[file-trigger:${registration.taskId}] Executing ${registration.flow.name} for ${pendingFileName || "*"}`
    );
    await executeFlow(
      {
        flow: registration.flow,
        mode: "run",
        source: "file-trigger",
        triggerTaskId: registration.taskId,
        triggerLabel: registration.taskName
      },
      {
        onEvent: (runnerEvent) => {
          recordRunnerEvent(runnerEvent);
          dispatchRunEventToAllWindows(runnerEvent);
        }
      }
    );
    console.info(
      `[file-trigger:${registration.taskId}] Completed ${registration.flow.name} for ${pendingFileName || "*"}`
    );
  } catch (error) {
    console.warn(
      `[file-trigger:${registration.taskId}] Failed to execute flow for ${pendingFileName || "*"}:`,
      error
    );
  } finally {
    registration.isRunning = false;

    if (registration.rerunRequested) {
      registration.rerunRequested = false;
      void runFileTrigger(registration);
    }
  }
}

function disposeFileTrigger(registration: RegisteredFileTrigger) {
  if (registration.debounceTimer) {
    clearTimeout(registration.debounceTimer);
  }

  registration.watcher.close();
}

function normalizeFileEventType(eventType: string) {
  return eventType === "rename" || eventType === "change" ? eventType : null;
}

function normalizeFileEventTypes(
  eventTypes: string[] | undefined
): FileTriggerEventType[] {
  const normalized = (eventTypes ?? ["rename", "change"])
    .map((eventType) => normalizeFileEventType(eventType))
    .filter((eventType): eventType is FileTriggerEventType => Boolean(eventType));

  return normalized.length > 0 ? Array.from(new Set(normalized)) : ["rename", "change"];
}

function normalizeWatchFileName(fileName: string | Buffer | null) {
  if (!fileName) {
    return "";
  }

  const value = typeof fileName === "string" ? fileName : fileName.toString("utf8");
  return value.replace(/\\/g, "/").trim();
}

function matchesFilePattern(fileName: string, pattern: string) {
  const fileNameCandidates = Array.from(
    new Set([fileName, fileName.split("/").at(-1) ?? fileName])
  );

  return expandBracePattern(pattern).some((candidate) => {
    const matcher = createGlobMatcher(candidate);
    return fileNameCandidates.some((value) => matcher.test(value));
  });
}

function expandBracePattern(pattern: string): string[] {
  const braceMatch = pattern.match(/\{([^{}]+)\}/);

  if (!braceMatch || braceMatch.index == null) {
    return [pattern];
  }

  const prefix = pattern.slice(0, braceMatch.index);
  const suffix = pattern.slice(braceMatch.index + braceMatch[0].length);

  return braceMatch[1]
    .split(",")
    .flatMap((part) => expandBracePattern(`${prefix}${part.trim()}${suffix}`));
}

function createGlobMatcher(pattern: string) {
  const normalizedPattern = pattern.replace(/\\/g, "/");
  const placeholder = "__DOUBLE_STAR__";
  const escaped = normalizedPattern
    .replace(/\*\*/g, placeholder)
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, ".")
    .replace(new RegExp(placeholder, "g"), ".*");

  return new RegExp(`^${escaped}$`, "i");
}

function isSameBinding(current: RegisteredFileTrigger, next: FileTriggerBinding) {
  return (
    current.flow.id === next.flow.id &&
    current.directory === next.directory &&
    current.filePattern === next.filePattern &&
    current.recursive === next.recursive &&
    current.eventTypes.join("|") === next.eventTypes.join("|")
  );
}

function getWorkspaceStatePath() {
  return join(app.getPath("userData"), workspaceStateFileName);
}

function getRunHistoryPath() {
  return join(app.getPath("userData"), runHistoryFileName);
}

function recordRunnerEvent(runnerEvent: RunnerEvent) {
  const appLookup = latestWorkspaceSnapshot?.appRecords.find(
    (record) => record.flow.id === runnerEvent.flowId
  );

  persistedRunHistory = applyRunnerEventToRunHistory(
    persistedRunHistory,
    runnerEvent,
    appLookup
      ? {
          appId: appLookup.app.id,
          appName: appLookup.app.name
        }
      : undefined
  );

  void persistRunHistory();
}

function persistRunHistory() {
  const serializedHistory = JSON.stringify(persistedRunHistory, null, 2);
  const runHistoryPath = getRunHistoryPath();

  runHistoryWriteChain = runHistoryWriteChain
    .catch(() => undefined)
    .then(() => writeFile(runHistoryPath, serializedHistory, "utf8"))
    .catch((error) => {
      console.warn("[run-history] Failed to persist run history:", error);
    });

  return runHistoryWriteChain;
}

function isMissingFileError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}

function stripLeadingByteOrderMark(value: string) {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function isStudioWorkspaceSnapshot(value: unknown): value is StudioWorkspaceSnapshot {
  return (
    typeof value === "object" &&
    value !== null &&
    "appRecords" in value &&
    "taskRecords" in value &&
    Array.isArray((value as StudioWorkspaceSnapshot).appRecords) &&
    Array.isArray((value as StudioWorkspaceSnapshot).taskRecords)
  );
}

type FileTriggerEventType = "rename" | "change";

interface TriggerConfig {
  directory?: string;
  filePattern?: string;
  recursive?: boolean;
  eventTypes?: string[];
}

interface StudioTaskRecord {
  id: string;
  appId: string;
  name: string;
  trigger: string;
  enabled: boolean;
  config?: TriggerConfig;
}

interface StudioAppRecord {
  app: {
    id: string;
    name: string;
  };
  flow: FlowDefinition;
}

interface StudioWorkspaceSnapshot {
  appRecords: StudioAppRecord[];
  taskRecords: StudioTaskRecord[];
}

interface FileTriggerBinding {
  taskId: string;
  taskName: string;
  flow: FlowDefinition;
  directory: string;
  recursive: boolean;
  filePattern: string;
  eventTypes: FileTriggerEventType[];
}

interface RegisteredFileTrigger extends FileTriggerBinding {
  watcher: FSWatcher;
  debounceTimer: NodeJS.Timeout | null;
  isRunning: boolean;
  rerunRequested: boolean;
  pendingFileName: string | null;
}
