import {
  createFlowActionNode,
  getExecutableFlowNodes,
  getFirstExecutableNodeId,
  insertActionNodeAfter,
  moveFlowNode,
  removeFlowNode,
  updateFlowNode
} from "@lightsaber-rpa/flow-core";
import type { RunnerEvent } from "@lightsaber-rpa/runner";
import { useEffect, useMemo, useRef, useState } from "react";

import { BottomPanels } from "./components/BottomPanels";
import { Canvas } from "./components/Canvas";
import { InstructionSidebar } from "./components/InstructionSidebar";
import { PlaceholderWorkspace } from "./components/PlaceholderWorkspace";
import { RightPanel } from "./components/RightPanel";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { TriggersWorkspace } from "./components/TriggersWorkspace";
import {
  createDraftStudioApp,
  deriveBottomPanels,
  deriveResourceStats,
  instructionGroups,
  navItems,
  tasks,
  studioApps
} from "./data/mock";
import type {
  BottomPanelRecord,
  ExecutionMode,
  FlowStepStatusMap,
  InstructionPaletteEntry,
  NavSectionId,
  StudioWorkspaceSnapshot,
  TriggerDraftInput
} from "./types";

export function App() {
  const [bridgeLabel, setBridgeLabel] = useState("Runner offline");
  const [workspaceLabel, setWorkspaceLabel] = useState("Loading workspace");
  const [appRecords, setAppRecords] = useState(studioApps);
  const [taskRecords, setTaskRecords] = useState(tasks);
  const [selectedSectionId, setSelectedSectionId] = useState<NavSectionId>("apps");
  const [selectedAppId, setSelectedAppId] = useState(studioApps[0]?.app.id ?? "");
  const [selectedNodeId, setSelectedNodeId] = useState(
    getFirstExecutableNodeId(studioApps[0]?.flow) ?? ""
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const [executionMode, setExecutionMode] = useState<ExecutionMode | null>(null);
  const [nodeStatuses, setNodeStatuses] = useState<FlowStepStatusMap>({});
  const [runLogItems, setRunLogItems] = useState<string[]>([]);
  const activeRunIdRef = useRef<string | null>(null);

  const runtimeLabel = useMemo(
    () => `${bridgeLabel} / ${workspaceLabel}`,
    [bridgeLabel, workspaceLabel]
  );

  useEffect(() => {
    void window.lightSaberStudio
      .ping()
      .then(() => {
        setBridgeLabel("Runner connected");
      })
      .catch(() => {
        setBridgeLabel("Bridge not ready");
      });
  }, []);

  useEffect(() => {
    let isActive = true;

    void window.lightSaberStudio
      .loadWorkspaceState()
      .then((snapshot) => {
        if (!isActive) {
          return;
        }

        if (!isStudioWorkspaceSnapshot(snapshot) || snapshot.appRecords.length === 0) {
          setWorkspaceLabel("Workspace ready");
          return;
        }

        setAppRecords(snapshot.appRecords);
        setTaskRecords(Array.isArray(snapshot.taskRecords) ? snapshot.taskRecords : tasks);
        setSelectedAppId(snapshot.appRecords[0]?.app.id ?? studioApps[0]?.app.id ?? "");
        setSelectedNodeId(getFirstExecutableNodeId(snapshot.appRecords[0]?.flow) ?? "");
        setWorkspaceLabel("Workspace restored");
      })
      .catch(() => {
        if (isActive) {
          setWorkspaceLabel("Workspace load failed");
        }
      })
      .finally(() => {
        if (isActive) {
          setIsHydrated(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const selectedRecord = useMemo(
    () => appRecords.find((record) => record.app.id === selectedAppId) ?? appRecords[0] ?? studioApps[0],
    [appRecords, selectedAppId]
  );

  const workspaceNavItems = useMemo(
    () =>
      navItems.map((item) => {
        if (item.id === "apps") {
          return {
            ...item,
            count: appRecords.length
          };
        }

        if (item.id === "triggers") {
          return {
            ...item,
            count: taskRecords.length
          };
        }

        return item;
      }),
    [appRecords.length, taskRecords.length]
  );

  const selectedTasks = useMemo(
    () => taskRecords.filter((task) => task.appId === selectedRecord.app.id),
    [selectedRecord.app.id, taskRecords]
  );

  const resourceStats = useMemo(
    () => deriveResourceStats(selectedRecord),
    [selectedRecord]
  );

  const bottomPanels = useMemo(
    () =>
      applyExecutionPanels(
        deriveBottomPanels(selectedRecord, selectedTasks),
        runLogItems,
        executionMode
      ),
    [executionMode, runLogItems, selectedRecord, selectedTasks]
  );

  useEffect(() => {
    const fallbackNodeId = getFirstExecutableNodeId(selectedRecord.flow) ?? "";

    if (!selectedNodeId || !selectedRecord.flow.nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(fallbackNodeId);
    }
  }, [selectedNodeId, selectedRecord]);

  const selectedNode = useMemo(
    () => selectedRecord.flow.nodes.find((node) => node.id === selectedNodeId),
    [selectedNodeId, selectedRecord]
  );

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const saveTimer = window.setTimeout(() => {
      const snapshot: StudioWorkspaceSnapshot = {
        version: "0.1.0",
        savedAt: new Date().toISOString(),
        appRecords,
        taskRecords
      };

      void window.lightSaberStudio
        .saveWorkspaceState(snapshot as unknown as Record<string, unknown>)
        .then(() => {
          setWorkspaceLabel("Saved locally");
        })
        .catch(() => {
          setWorkspaceLabel("Workspace save failed");
        });
    }, 400);

    return () => {
      window.clearTimeout(saveTimer);
    };
  }, [appRecords, isHydrated, taskRecords]);

  useEffect(() => {
    const unsubscribe = window.lightSaberStudio.onRunEvent((event) => {
      handleRunnerEvent(event);
    });

    return () => {
      unsubscribe();
    };
  }, [appRecords, selectedAppId]);

  useEffect(() => {
    activeRunIdRef.current = null;
    setExecutionMode(null);
    setNodeStatuses({});
    setRunLogItems([]);
  }, [selectedAppId]);

  function handleSelectApp(appId: string) {
    setSelectedAppId(appId);

    const nextRecord = appRecords.find((record) => record.app.id === appId) ?? appRecords[0] ?? studioApps[0];
    setSelectedNodeId(getFirstExecutableNodeId(nextRecord.flow) ?? "");
  }

  function handleInsertInstruction(instruction: InstructionPaletteEntry) {
    if (executionMode) {
      return;
    }

    const nextNodeId = createActionNodeId(
      selectedRecord.flow.nodes.map((node) => node.id),
      instruction.id
    );
    const nextNode = createFlowActionNode({
      id: nextNodeId,
      name: instruction.name,
      instructionId: instruction.id,
      description: instruction.description,
      config: cloneConfig(instruction.defaultConfig)
    });

    setAppRecords((current) =>
      current.map((record) => {
        if (record.app.id !== selectedRecord.app.id) {
          return record;
        }

        return {
          ...record,
          app: {
            ...record.app,
            updatedAt: "Just now"
          },
          project: {
            ...record.project,
            updatedAt: "Just now"
          },
          flow: insertActionNodeAfter(record.flow, selectedNodeId, nextNode),
          lastRunLabel: `Edited ${instruction.name} moments ago`
        };
      })
    );

    setSelectedNodeId(nextNodeId);
    setWorkspaceLabel(`Inserted ${instruction.name}`);
  }

  function handleSelectedNodeChange(field: "name" | "description", value: string) {
    if (!selectedNodeId || executionMode) {
      return;
    }

    setAppRecords((current) =>
      current.map((record) => {
        if (record.app.id !== selectedRecord.app.id) {
          return record;
        }

        return {
          ...record,
          app: {
            ...record.app,
            updatedAt: "Just now"
          },
          project: {
            ...record.project,
            updatedAt: "Just now"
          },
          flow: updateFlowNode(record.flow, selectedNodeId, (node) => {
            if (node.kind === "start" || node.kind === "end") {
              return node;
            }

            return {
              ...node,
              [field]: value
            };
          }),
          lastRunLabel: "Edited flow details moments ago"
        };
      })
    );

    setWorkspaceLabel(`Editing ${selectedRecord.app.name}`);
  }

  function handleSelectedNodeConfigChange(configKey: string, value: string | number | boolean) {
    if (!selectedNodeId || executionMode) {
      return;
    }

    setAppRecords((current) =>
      current.map((record) => {
        if (record.app.id !== selectedRecord.app.id) {
          return record;
        }

        return {
          ...record,
          app: {
            ...record.app,
            updatedAt: "Just now"
          },
          project: {
            ...record.project,
            updatedAt: "Just now"
          },
          flow: updateFlowNode(record.flow, selectedNodeId, (node) => {
            if (node.kind !== "action") {
              return node;
            }

            return {
              ...node,
              config: {
                ...node.config,
                [configKey]: value
              }
            };
          }),
          lastRunLabel: `Updated ${configKey} just now`
        };
      })
    );

    setWorkspaceLabel(`Updated ${configKey}`);
  }

  function handleMoveSelectedNode(direction: "up" | "down") {
    if (!selectedNodeId || executionMode) {
      return;
    }

    setAppRecords((current) =>
      current.map((record) => {
        if (record.app.id !== selectedRecord.app.id) {
          return record;
        }

        return {
          ...record,
          app: {
            ...record.app,
            updatedAt: "Just now"
          },
          project: {
            ...record.project,
            updatedAt: "Just now"
          },
          flow: moveFlowNode(record.flow, selectedNodeId, direction),
          lastRunLabel: `Moved step ${direction}`
        };
      })
    );

    setWorkspaceLabel(direction === "up" ? "Moved step up" : "Moved step down");
  }

  function handleDeleteSelectedNode() {
    if (!selectedNodeId || executionMode) {
      return;
    }

    const executableNodes = getExecutableFlowNodes(selectedRecord.flow);
    const currentIndex = executableNodes.findIndex((node) => node.id === selectedNodeId);
    const fallbackNodeId =
      executableNodes[currentIndex + 1]?.id ??
      executableNodes[currentIndex - 1]?.id ??
      "";

    setAppRecords((current) =>
      current.map((record) => {
        if (record.app.id !== selectedRecord.app.id) {
          return record;
        }

        return {
          ...record,
          app: {
            ...record.app,
            updatedAt: "Just now"
          },
          project: {
            ...record.project,
            updatedAt: "Just now"
          },
          flow: removeFlowNode(record.flow, selectedNodeId),
          lastRunLabel: "Removed selected step"
        };
      })
    );

    setSelectedNodeId(fallbackNodeId);
    setWorkspaceLabel("Deleted selected step");
  }

  function handleToggleTaskEnabled(taskId: string) {
    setTaskRecords((current) =>
      current.map((task) => (task.id === taskId ? { ...task, enabled: !task.enabled } : task))
    );
    setWorkspaceLabel("Updated trigger state");
  }

  function handleCreateTrigger(input: TriggerDraftInput) {
    const appName =
      appRecords.find((record) => record.app.id === input.appId)?.app.name ?? "Unknown app";
    const nextTask = {
      id: createTriggerId(taskRecords),
      appId: input.appId,
      name: input.name,
      trigger: input.trigger,
      app: appName,
      condition: input.condition,
      enabled: input.enabled
    };

    setTaskRecords((current) => [nextTask, ...current]);
    setWorkspaceLabel(`Created trigger ${input.name}`);
  }

  function handleCreateApp() {
    if (executionMode) {
      return;
    }

    const nextSeed = getNextDraftSeed(appRecords);
    const nextRecord = createDraftStudioApp(nextSeed);

    setAppRecords((current) => [nextRecord, ...current]);
    setSelectedAppId(nextRecord.app.id);
    setSelectedNodeId(getFirstExecutableNodeId(nextRecord.flow) ?? "");
    setSelectedSectionId("apps");
    setWorkspaceLabel(`Created ${nextRecord.app.name}`);
  }

  function handleRun() {
    startRunnerExecution("run");
  }

  function handleDebug() {
    startRunnerExecution("debug");
  }

  function startRunnerExecution(mode: ExecutionMode) {
    const executableNodes = getExecutableFlowNodes(selectedRecord.flow);

    if (executableNodes.length === 0) {
      setWorkspaceLabel("Flow is empty");
      setRunLogItems(["Flow is empty. Add a few instructions before running playback."]);
      return;
    }

    activeRunIdRef.current = null;
    setExecutionMode(mode);
    setNodeStatuses(
      Object.fromEntries(executableNodes.map((node) => [node.id, "idle"])) as FlowStepStatusMap
    );
    setRunLogItems([`${mode === "debug" ? "Debug" : "Run"} requested for ${selectedRecord.app.name}`]);
    setWorkspaceLabel(mode === "debug" ? "Debug requested" : "Run requested");

    void window.lightSaberStudio.executeFlow({
      flow: selectedRecord.flow,
      mode
    }).catch((error) => {
      activeRunIdRef.current = null;
      setExecutionMode(null);
      setRunLogItems((current) =>
        appendRunLog(current, `Failed to start runner: ${error instanceof Error ? error.message : String(error)}`)
      );
      setWorkspaceLabel("Run request failed");
    });
  }

  function handleRunnerEvent(event: RunnerEvent) {
    if (event.type === "run.started") {
      activeRunIdRef.current = event.runId;
      setExecutionMode(event.mode);
      setRunLogItems((current) => appendRunLog(current, event.message));
      setWorkspaceLabel(event.mode === "debug" ? "Debug started" : "Run started");
      return;
    }

    if (activeRunIdRef.current && event.runId !== activeRunIdRef.current) {
      return;
    }

    if (event.type === "step.started") {
      setSelectedNodeId(event.nodeId);
      setNodeStatuses((current) => ({
        ...current,
        [event.nodeId]: "running"
      }));
      setRunLogItems((current) =>
        appendRunLog(current, `${formatStepIndex(event.stepIndex)} ${event.message}`)
      );
      return;
    }

    if (event.type === "step.completed") {
      setNodeStatuses((current) => ({
        ...current,
        [event.nodeId]: "success"
      }));
      setRunLogItems((current) =>
        appendRunLog(current, `${formatStepIndex(event.stepIndex)} ${event.message}`)
      );
      return;
    }

    if (event.type === "step.failed") {
      setNodeStatuses((current) => ({
        ...current,
        [event.nodeId]: "failed"
      }));
      setRunLogItems((current) =>
        appendRunLog(current, `${formatStepIndex(event.stepIndex)} ${event.message}`)
      );
      setExecutionMode(null);
      setWorkspaceLabel("Run failed");
      return;
    }

    if (event.type === "run.completed") {
      activeRunIdRef.current = null;
      setExecutionMode(null);
      setRunLogItems((current) => appendRunLog(current, event.message));
      setWorkspaceLabel(event.status === "success" ? "Run finished" : "Run failed");
      setAppRecords((current) =>
        current.map((record) => {
          if (record.app.id !== selectedRecord.app.id) {
            return record;
          }

          return {
            ...record,
            lastRunLabel: event.status === "success" ? "Ran just now" : "Run failed just now",
            app: {
              ...record.app,
              updatedAt: "Just now"
            },
            project: {
              ...record.project,
              updatedAt: "Just now"
            }
          };
        })
      );
    }
  }

  return (
    <div className="app-shell">
      <TopBar
        activeItemId={selectedSectionId}
        items={workspaceNavItems}
        onSelect={setSelectedSectionId}
        runtimeLabel={runtimeLabel}
      />

      <div className="app-shell__workspace">
        <Sidebar
          activeItemId={selectedSectionId}
          items={workspaceNavItems}
          onCreateApp={handleCreateApp}
          onSelect={setSelectedSectionId}
        />

        <section className="main-area">
          {selectedSectionId === "apps" ? (
            <>
              <div className="main-area__projects">
                <div className="section-header">
                  <div>
                    <h2>My Apps</h2>
                    <div className="section-header__caption">
                      Select an app to inspect its flow, summary, and trigger bindings.
                    </div>
                  </div>
                  <div className="section-header__tools">
                    <div className="search-chip">Search apps</div>
                  </div>
                </div>

                <div className="project-table">
                  <div className="project-table__head">
                    <span>App name</span>
                    <span>Updated</span>
                    <span>Status</span>
                  </div>

                  {appRecords.map((record) => (
                    <button
                      key={record.app.id}
                      className={`project-row${record.app.id === selectedRecord.app.id ? " is-active" : ""}`}
                      onClick={() => handleSelectApp(record.app.id)}
                      type="button"
                    >
                      <div className="project-row__name">
                        <span className="project-row__badge">{record.badge}</span>
                        <span>
                          <span className="project-row__title">{record.app.name}</span>
                          <span className="project-row__domain">{record.domain}</span>
                        </span>
                      </div>
                      <span className="project-row__muted">{record.app.updatedAt}</span>
                      <span className={`project-row__state ${record.app.status === "active" ? "is-published" : ""}`}>
                        {record.app.status === "active" ? "Active" : "Draft"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="main-area__editor">
                <InstructionSidebar
                  disabled={executionMode !== null}
                  groups={instructionGroups}
                  onInsertInstruction={handleInsertInstruction}
                  selectedNodeLabel={selectedNode?.name}
                />
                <Canvas
                  executionMode={executionMode}
                  nodeStatuses={nodeStatuses}
                  onDebug={handleDebug}
                  onRun={handleRun}
                  onSelectNode={setSelectedNodeId}
                  record={selectedRecord}
                  selectedNodeId={selectedNodeId}
                />
                <RightPanel
                  isReadOnly={executionMode !== null}
                  onDeleteSelectedNode={handleDeleteSelectedNode}
                  onMoveSelectedNode={handleMoveSelectedNode}
                  onSelectedNodeConfigChange={handleSelectedNodeConfigChange}
                  onSelectedNodeChange={handleSelectedNodeChange}
                  record={selectedRecord}
                  selectedNodeId={selectedNodeId}
                  stats={resourceStats}
                  tasks={selectedTasks}
                />
              </div>

              <BottomPanels panels={bottomPanels} />
            </>
          ) : null}

          {selectedSectionId === "triggers" ? (
            <TriggersWorkspace
              apps={appRecords.map((record) => ({
                id: record.app.id,
                name: record.app.name
              }))}
              onCreateTask={handleCreateTrigger}
              onToggleTaskEnabled={handleToggleTaskEnabled}
              tasks={taskRecords}
            />
          ) : null}
          {selectedSectionId === "market" ? <PlaceholderWorkspace sectionLabel="Market" /> : null}
          {selectedSectionId === "tutorials" ? <PlaceholderWorkspace sectionLabel="Guides" /> : null}
          {selectedSectionId === "community" ? <PlaceholderWorkspace sectionLabel="Community" /> : null}
        </section>
      </div>
    </div>
  );
}

function applyExecutionPanels(
  panels: BottomPanelRecord[],
  runLogItems: string[],
  executionMode: ExecutionMode | null
) {
  return panels.map((panel) => {
    if (panel.id !== "run-log") {
      return panel;
    }

    if (runLogItems.length === 0) {
      return panel;
    }

    return {
      ...panel,
      status: executionMode
        ? executionMode === "debug"
          ? "Debug playback running"
          : "Run playback running"
        : "Latest local playback",
      items: runLogItems
    };
  });
}

function appendRunLog(current: string[], entry: string) {
  return [...current, entry].slice(-8);
}

function cloneConfig(config: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
}

function createActionNodeId(existingIds: string[], instructionId: string) {
  const baseId = instructionId.replace(/[^\w-]+/g, "-");
  let suffix = 1;
  let candidateId = `${baseId}-${suffix}`;

  while (existingIds.includes(candidateId)) {
    suffix += 1;
    candidateId = `${baseId}-${suffix}`;
  }

  return candidateId;
}

function formatStepIndex(index: number) {
  return `${String(index + 1).padStart(2, "0")}.`;
}

function getNextDraftSeed(appRecords: typeof studioApps) {
  return appRecords.filter((record) => record.app.id.startsWith("draft-app-")).length + 1;
}

function createTriggerId(taskRecords: { id: string }[]) {
  return `task-${taskRecords.length + 1}`;
}

function isStudioWorkspaceSnapshot(value: unknown): value is StudioWorkspaceSnapshot {
  return (
    typeof value === "object" &&
    value !== null &&
    "appRecords" in value &&
    Array.isArray((value as StudioWorkspaceSnapshot).appRecords)
  );
}
