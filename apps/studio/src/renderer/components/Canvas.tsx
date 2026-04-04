import { getExecutableFlowNodes, type FlowNodeStatus, type FlowNode } from "@lightsaber-rpa/flow-core";

import type { ExecutionMode, FlowStepStatusMap, StudioAppRecord } from "../types";

interface CanvasProps {
  record: StudioAppRecord;
  selectedNodeId?: string;
  executionMode: ExecutionMode | null;
  nodeStatuses: FlowStepStatusMap;
  onSelectNode: (nodeId: string) => void;
  onRun: () => void;
  onDebug: () => void;
}

export function Canvas({
  record,
  selectedNodeId,
  executionMode,
  nodeStatuses,
  onSelectNode,
  onRun,
  onDebug
}: CanvasProps) {
  const visibleNodes = getExecutableFlowNodes(record.flow);
  const selectedNode = visibleNodes.find((node) => node.id === selectedNodeId);
  const isBusy = executionMode !== null;

  return (
    <main className="canvas">
      <div className="canvas__header">
        <div>
          <div className="canvas__eyebrow">{record.app.name}</div>
          <h1 className="canvas__title">{record.flow.name}</h1>
        </div>
        <div className="canvas__toolbar">
          <button
            className="canvas__toolbar-button is-primary"
            disabled={isBusy}
            onClick={onRun}
            type="button"
          >
            {executionMode === "run" ? "Running..." : "Run"}
          </button>
          <button
            className="canvas__toolbar-button"
            disabled={isBusy}
            onClick={onDebug}
            type="button"
          >
            {executionMode === "debug" ? "Debugging..." : "Debug"}
          </button>
          <button className="canvas__toolbar-button" disabled type="button">
            Record
          </button>
        </div>
      </div>

      <div className="canvas__summary-row">
        <article className="canvas__summary-card">
          <span className="canvas__summary-label">Scenario</span>
          <strong>{record.domain}</strong>
          <p>{record.scenario}</p>
        </article>
        <article className="canvas__summary-card">
          <span className="canvas__summary-label">Flow graph</span>
          <strong>
            {record.flow.nodes.length} nodes / {record.flow.edges.length} edges
          </strong>
          <p>{record.lastRunLabel}</p>
        </article>
      </div>

      {visibleNodes.length === 0 ? (
        <div className="canvas__empty-state">
          <div className="canvas__hero" aria-hidden="true">
            <div className="canvas__hero-badge">LS</div>
            <div className="canvas__hero-art">
              <div className="canvas__hero-circle" />
              <div className="canvas__hero-card canvas__hero-card--top" />
              <div className="canvas__hero-card canvas__hero-card--bottom" />
            </div>
          </div>
          <h2>Start building this flow</h2>
          <p>
            This app is still empty. Pick an instruction from the left palette to create the first
            step, then select it to keep shaping the flow.
          </p>
        </div>
      ) : (
        <>
          <div className="canvas__selection-banner">
            <span className="canvas__selection-label">Selected step</span>
            <strong>{selectedNode?.name ?? "Nothing selected yet"}</strong>
            <p>
              Pick a step in the flow, then add a new instruction from the left palette to insert
              it right after the selection.
            </p>
          </div>

          <div className="flow-step-list">
            {visibleNodes.map((node, index) => (
              <button
                key={node.id}
                className={`flow-step-card${node.id === selectedNodeId ? " is-active" : ""}${getNodeStatusClassName(nodeStatuses[node.id])}`}
                onClick={() => onSelectNode(node.id)}
                type="button"
              >
                <div className="flow-step-card__index">{String(index + 1).padStart(2, "0")}</div>
                <div className="flow-step-card__content">
                  <div className="flow-step-card__header">
                    <div>
                      <h3>{node.name}</h3>
                      <p>{node.description ?? "No step description yet."}</p>
                    </div>
                    <div className="flow-step-card__badges">
                      <span className={`flow-step-card__kind kind-${node.kind}`}>{node.kind}</span>
                      {nodeStatuses[node.id] ? (
                        <span className={`flow-step-card__status is-${nodeStatuses[node.id]}`}>
                          {nodeStatuses[node.id]}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flow-step-card__meta">
                    {renderNodeMeta(node)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function renderNodeMeta(node: FlowNode) {
  if (node.kind === "action") {
    return (
      <>
        <span>instruction: {node.instructionId}</span>
        <span>config keys: {Object.keys(node.config).length}</span>
      </>
    );
  }

  if (node.kind === "condition") {
    return <span>expression: {node.expression}</span>;
  }

  if (node.kind === "loop") {
    return <span>iterate: {node.collectionExpression}</span>;
  }

  return <span>kind: {node.kind}</span>;
}

function getNodeStatusClassName(status: FlowNodeStatus | undefined) {
  return status ? ` is-${status}` : "";
}
