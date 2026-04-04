import { app, BrowserWindow, ipcMain } from "electron";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = fileURLToPath(new URL(".", import.meta.url));
const workspaceStateFileName = "workspace-state.json";

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

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
    return;
  }

  mainWindow.loadFile(join(currentDir, "../renderer/index.html"));
}

app.whenReady().then(() => {
  ipcMain.handle("studio:ping", () => ({ ok: true, timestamp: Date.now() }));
  ipcMain.handle("studio:workspace-state:load", async () => {
    const workspaceStatePath = getWorkspaceStatePath();

    try {
      const fileContents = await readFile(workspaceStatePath, "utf8");
      return JSON.parse(fileContents) as unknown;
    } catch (error) {
      if (isMissingFileError(error)) {
        return null;
      }

      throw error;
    }
  });
  ipcMain.handle("studio:workspace-state:save", async (_event, workspaceState: unknown) => {
    const workspaceStatePath = getWorkspaceStatePath();
    const serializedState = JSON.stringify(workspaceState, null, 2);

    await writeFile(workspaceStatePath, serializedState, "utf8");

    return {
      ok: true as const,
      path: workspaceStatePath,
      timestamp: Date.now()
    };
  });
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function getWorkspaceStatePath() {
  return join(app.getPath("userData"), workspaceStateFileName);
}

function isMissingFileError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}
