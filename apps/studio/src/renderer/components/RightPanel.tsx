import { getInstructionManifest } from "@lightsaber-rpa/instruction-manifests";
import { findFlowNode } from "@lightsaber-rpa/flow-core";

import type { ResourceStat, StudioAppRecord, StudioTaskRecord } from "../types";

interface RightPanelProps {
  isReadOnly?: boolean;
  onSelectedNodeConfigChange: (key: string, value: string | number | boolean) => void;
  record: StudioAppRecord;
  stats: ResourceStat[];
  tasks: StudioTaskRecord[];
  selectedNodeId?: string;
  onSelectedNodeChange: (field: "name" | "description", value: string) => void;
}

export function RightPanel({
  isReadOnly,
  onSelectedNodeConfigChange,
  record,
  stats,
  tasks,
  selectedNodeId,
  onSelectedNodeChange
}: RightPanelProps) {
  const selectedNode = findFlowNode(record.flow, selectedNodeId);
  const selectedManifest =
    selectedNode?.kind === "action" ? getInstructionManifest(selectedNode.instructionId) : undefined;
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
                disabled={isReadOnly}
                onChange={(event) => onSelectedNodeChange("name", event.target.value)}
                type="text"
                value={selectedNode.name}
              />
            </label>

            <label className="form-field">
              <span className="form-field__label">Description</span>
              <textarea
                disabled={isReadOnly}
                onChange={(event) => onSelectedNodeChange("description", event.target.value)}
                rows={4}
                value={selectedNode.description ?? ""}
              />
            </label>

            <div className="selection-editor__hint">
              Select another step in the canvas or add a new action from the instruction palette.
            </div>

            {selectedNode.kind === "action" && selectedManifest?.inputSchema ? (
              <div className="config-field-group">
                <div className="form-field__label">Action config</div>
                <div className="config-field-grid">
                  {Object.entries(selectedManifest.inputSchema).map(([key, descriptor]) =>
                    renderConfigField({
                      descriptor,
                      disabled: isReadOnly,
                      keyName: key,
                      onChange: onSelectedNodeConfigChange,
                      value: selectedNode.config[key]
                    })
                  )}
                </div>
              </div>
            ) : null}

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

function renderConfigField(props: {
  keyName: string;
  value: unknown;
  descriptor: unknown;
  disabled?: boolean;
  onChange: (key: string, value: string | number | boolean) => void;
}) {
  const schema = normalizeSchemaDescriptor(props.descriptor);

  if (!schema || (schema.type !== "string" && schema.type !== "number" && schema.type !== "boolean")) {
    return (
      <div key={props.keyName} className="config-field is-readonly">
        <div className="form-field__label">{props.keyName}</div>
        <div className="config-field__readonly">
          Structured field. Keep using the JSON preview for complex values.
        </div>
      </div>
    );
  }

  if (schema.type === "boolean") {
    return (
      <label key={props.keyName} className="checkbox-field">
        <input
          checked={Boolean(props.value)}
          disabled={props.disabled}
          onChange={(event) => props.onChange(props.keyName, event.target.checked)}
          type="checkbox"
        />
        <span>
          <strong>{props.keyName}</strong>
          <small>{schema.optional ? "Optional toggle" : "Required toggle"}</small>
        </span>
      </label>
    );
  }

  return (
    <label key={props.keyName} className="form-field">
      <span className="form-field__label">
        {props.keyName}
        {schema.optional ? " (optional)" : ""}
      </span>
      <input
        disabled={props.disabled}
        onChange={(event) =>
          props.onChange(
            props.keyName,
            schema.type === "number" ? Number(event.target.value || 0) : event.target.value
          )
        }
        type={schema.type === "number" ? "number" : "text"}
        value={schema.type === "number" ? Number(props.value ?? 0) : String(props.value ?? "")}
      />
    </label>
  );
}

function normalizeSchemaDescriptor(descriptor: unknown) {
  if (!descriptor || typeof descriptor !== "object" || !("type" in descriptor)) {
    return null;
  }

  return descriptor as {
    type?: string;
    optional?: boolean;
  };
}
