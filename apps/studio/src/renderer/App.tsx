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
  deriveBottomPanels,
  deriveResourceStats,
  getTasksForApp,
  instructionGroups,
  navItems,
  tasks,
  studioApps
} from "./data/mock";
import type { InstructionPaletteEntry, NavSectionId } from "./types";

export function App() {
  const [runtimeLabel, setRuntimeLabel] = useState("Runner offline");
  const [appRecords, setAppRecords] = useState(studioApps);
  const [selectedSectionId, setSelectedSectionId] = useState<NavSectionId>("apps");
  const [selectedAppId, setSelectedAppId] = useState(studioApps[0]?.app.id ?? "");
  const [selectedNodeId, setSelectedNodeId] = useState(
    getFirstExecutableNodeId(studioApps[0]?.flow) ?? ""
  );

  useEffect(() => {
    if (!window.lightSaberStudio?.ping) {
      return;
    }

    void window.lightSaberStudio
      .ping()
      .then(() => {
        setRuntimeLabel("Runner connected");
      })
      .catch(() => {
        setRuntimeLabel("Bridge not ready");
      });
  }, []);

  const selectedRecord = useMemo(
    () => appRecords.find((record) => record.app.id === selectedAppId) ?? appRecords[0],
    [appRecords, selectedAppId]
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
    setRuntimeLabel(`Inserted ${instruction.name}`);
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

    setRuntimeLabel(`Editing ${selectedRecord.app.name}`);
  }

  return (
    <div className="app-shell">
      <TopBar
        activeItemId={selectedSectionId}
        items={navItems}
        onSelect={setSelectedSectionId}
        runtimeLabel={runtimeLabel}
      />

      <div className="app-shell__workspace">
        <Sidebar
          activeItemId={selectedSectionId}
          items={navItems}
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
