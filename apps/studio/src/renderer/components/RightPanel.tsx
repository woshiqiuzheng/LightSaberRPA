import { findFlowNode } from "@lightsaber-rpa/flow-core";

import type { ResourceStat, StudioAppRecord, StudioTaskRecord } from "../types";

interface RightPanelProps {
  record: StudioAppRecord;
  stats: ResourceStat[];
  tasks: StudioTaskRecord[];
  selectedNodeId?: string;
  onSelectedNodeChange: (field: "name" | "description", value: string) => void;
}

export function RightPanel({
  record,
  stats,
  tasks,
  selectedNodeId,
  onSelectedNodeChange
}: RightPanelProps) {
  const selectedNode = findFlowNode(record.flow, selectedNodeId);
  const selectedConfigPreview =
    selectedNode?.kind === "action" ? JSON.stringify(selectedNode.config, null, 2) : undefined;

  return (
    <aside className="right-panel">
      <section className="panel-card">
        <div className="panel-card__title">Flow</div>
        <div className="panel-tree">
          <div className="panel-tree__root">{record.app.name}</div>
          <div className="panel-tree__node is-indented">References</div>
          <div className="panel-tree__node is-indented">Resource files</div>
          <div className="panel-tree__node is-indented is-active">{record.flow.name}</div>
        </div>
        <div className="panel-tree__meta">
          <span>version {record.project.version}</span>
          <span>{record.flow.nodes.length} nodes</span>
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-card__title">Selection</div>

        {selectedNode && selectedNode.kind !== "start" && selectedNode.kind !== "end" ? (
          <div className="selection-editor">
            <div className="selection-editor__chips">
              <span className="selection-editor__chip">{selectedNode.kind}</span>
              {selectedNode.kind === "action" ? (
                <span className="selection-editor__chip is-outline">{selectedNode.instructionId}</span>
              ) : null}
            </div>

            <label className="form-field">
              <span className="form-field__label">Step name</span>
              <input
                onChange={(event) => onSelectedNodeChange("name", event.target.value)}
                type="text"
                value={selectedNode.name}
              />
            </label>

            <label className="form-field">
              <span className="form-field__label">Description</span>
              <textarea
                onChange={(event) => onSelectedNodeChange("description", event.target.value)}
                rows={4}
                value={selectedNode.description ?? ""}
              />
            </label>

            <div className="selection-editor__hint">
              Select another step in the canvas or add a new action from the instruction palette.
            </div>

            {selectedConfigPreview ? (
              <div className="selection-editor__config">
                <div className="form-field__label">Config preview</div>
                <pre>{selectedConfigPreview}</pre>
              </div>
            ) : null}
          </div>
        ) : (
          <article className="task-card">
            <div className="task-card__condition">
              Select a flow step to inspect and edit its summary details here.
            </div>
          </article>
        )}
      </section>

      <section className="panel-card">
        <div className="panel-card__title">Flow Summary</div>
        <div className="metric-grid">
          {stats.map((stat) => (
            <article key={stat.label} className="metric-card">
              <div className="metric-card__label">{stat.label}</div>
              <div className="metric-card__value">{stat.value}</div>
              <div className="metric-card__note">{stat.note}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-card__title">Scheduled Tasks</div>
        <div className="task-list">
          {tasks.length === 0 ? (
            <article className="task-card">
              <div className="task-card__condition">
                No trigger bindings yet. The runner will show schedules and file watches here.
              </div>
            </article>
          ) : (
            tasks.map((task) => (
              <article key={task.id} className="task-card">
                <div className="task-card__head">
                  <strong>{task.name}</strong>
                  <span className={task.enabled ? "task-card__state is-on" : "task-card__state is-off"}>
                    {task.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="task-card__meta">
                  <span>{task.trigger}</span>
                  <span>{task.app}</span>
                </div>
                <p className="task-card__condition">{task.condition}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </aside>
  );
}
