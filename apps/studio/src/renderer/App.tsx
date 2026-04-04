import {
  createFlowActionNode,
  getFirstExecutableNodeId,
  insertActionNodeAfter,
  updateFlowNode
} from "@lightsaber-rpa/flow-core";
import { useEffect, useMemo, useState } from "react";

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
  getTasksForApp,
  instructionGroups,
  navItems,
  tasks,
  studioApps
} from "./data/mock";
import type {
  InstructionPaletteEntry,
  NavSectionId,
  StudioWorkspaceSnapshot
} from "./types";

export function App() {
  const [bridgeLabel, setBridgeLabel] = useState("Runner offline");
  const [workspaceLabel, setWorkspaceLabel] = useState("Loading workspace");
  const [appRecords, setAppRecords] = useState(studioApps);
  const [selectedSectionId, setSelectedSectionId] = useState<NavSectionId>("apps");
  const [selectedAppId, setSelectedAppId] = useState(studioApps[0]?.app.id ?? "");
  const [selectedNodeId, setSelectedNodeId] = useState(
    getFirstExecutableNodeId(studioApps[0]?.flow) ?? ""
  );
  const [isHydrated, setIsHydrated] = useState(false);

  const runtimeLabel = useMemo(
    () => `${bridgeLabel} · ${workspaceLabel}`,
    [bridgeLabel, workspaceLabel]
  );

  useEffect(() => {
    if (!window.lightSaberStudio?.ping) {
      return;
    }

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

        if (!isStudioWorkspaceSnapshot(snapshot)) {
          setWorkspaceLabel("Workspace ready");
          return;
        }

        if (snapshot.appRecords.length === 0) {
          setWorkspaceLabel("Workspace ready");
          return;
        }

        setAppRecords(snapshot.appRecords);
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
    () => appRecords.find((record) => record.app.id === selectedAppId) ?? appRecords[0],
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
            count: tasks.length
          };
        }

        return item;
      }),
    [appRecords.length]
  );

  const selectedTasks = useMemo(
    () => getTasksForApp(selectedRecord.app.id),
    [selectedRecord.app.id]
  );

  const resourceStats = useMemo(
    () => deriveResourceStats(selectedRecord),
    [selectedRecord]
  );

  const bottomPanels = useMemo(
    () => deriveBottomPanels(selectedRecord, selectedTasks),
    [selectedRecord, selectedTasks]
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
        appRecords
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
  }, [appRecords, isHydrated]);

  function handleSelectApp(appId: string) {
    setSelectedAppId(appId);

    const nextRecord = appRecords.find((record) => record.app.id === appId) ?? appRecords[0];
    setSelectedNodeId(getFirstExecutableNodeId(nextRecord.flow) ?? "");
  }

  function handleInsertInstruction(instruction: InstructionPaletteEntry) {
    const nextNodeId = createActionNodeId(selectedRecord.flow.nodes.map((node) => node.id), instruction.id);
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
    if (!selectedNodeId) {
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

  function handleCreateApp() {
    const nextSeed = getNextDraftSeed(appRecords);
    const nextRecord = createDraftStudioApp(nextSeed);

    setAppRecords((current) => [nextRecord, ...current]);
    setSelectedAppId(nextRecord.app.id);
    setSelectedNodeId(getFirstExecutableNodeId(nextRecord.flow) ?? "");
    setSelectedSectionId("apps");
    setWorkspaceLabel(`Created ${nextRecord.app.name}`);
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
                  groups={instructionGroups}
                  onInsertInstruction={handleInsertInstruction}
                  selectedNodeLabel={selectedNode?.name}
                />
                <Canvas
                  onSelectNode={setSelectedNodeId}
                  record={selectedRecord}
                  selectedNodeId={selectedNodeId}
                />
                <RightPanel
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

          {selectedSectionId === "triggers" ? <TriggersWorkspace tasks={tasks} /> : null}
          {selectedSectionId === "market" ? <PlaceholderWorkspace sectionLabel="Market" /> : null}
          {selectedSectionId === "tutorials" ? <PlaceholderWorkspace sectionLabel="Guides" /> : null}
          {selectedSectionId === "community" ? <PlaceholderWorkspace sectionLabel="Community" /> : null}
        </section>
      </div>
    </div>
  );
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

function getNextDraftSeed(appRecords: typeof studioApps) {
  return appRecords.filter((record) => record.app.id.startsWith("draft-app-")).length + 1;
}

function isStudioWorkspaceSnapshot(value: unknown): value is StudioWorkspaceSnapshot {
  return (
    typeof value === "object" &&
    value !== null &&
    "appRecords" in value &&
    Array.isArray((value as StudioWorkspaceSnapshot).appRecords)
  );
}
