import { useEffect, useMemo, useState } from "react";

import { BottomPanels } from "./components/BottomPanels";
import { Canvas } from "./components/Canvas";
import { InstructionSidebar } from "./components/InstructionSidebar";
import { RightPanel } from "./components/RightPanel";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import {
  deriveBottomPanels,
  deriveResourceStats,
  getTasksForApp,
  instructionGroups,
  navItems,
  studioApps
} from "./data/mock";

export function App() {
  const [runtimeLabel, setRuntimeLabel] = useState("Runner offline");
  const [selectedAppId, setSelectedAppId] = useState(studioApps[0]?.app.id ?? "");

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
    () => studioApps.find((record) => record.app.id === selectedAppId) ?? studioApps[0],
    [selectedAppId]
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

  return (
    <div className="app-shell">
      <TopBar items={navItems} runtimeLabel={runtimeLabel} />

      <div className="app-shell__workspace">
        <Sidebar items={navItems} />

        <section className="main-area">
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

              {studioApps.map((record) => (
                <button
                  key={record.app.id}
                  className={`project-row${record.app.id === selectedRecord.app.id ? " is-active" : ""}`}
                  onClick={() => setSelectedAppId(record.app.id)}
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
            <InstructionSidebar groups={instructionGroups} />
            <Canvas record={selectedRecord} />
            <RightPanel record={selectedRecord} stats={resourceStats} tasks={selectedTasks} />
          </div>

          <BottomPanels panels={bottomPanels} />
        </section>
      </div>
    </div>
  );
}
