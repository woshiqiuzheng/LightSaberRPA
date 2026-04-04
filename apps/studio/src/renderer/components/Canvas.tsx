import type { FlowNode } from "@lightsaber-rpa/flow-core";

import type { StudioAppRecord } from "../types";

interface CanvasProps {
  record: StudioAppRecord;
}

export function Canvas({ record }: CanvasProps) {
  const visibleNodes = record.flow.nodes.filter(
    (node) => node.kind !== "start" && node.kind !== "end"
  );

  return (
    <main className="canvas">
      <div className="canvas__header">
        <div>
          <div className="canvas__eyebrow">{record.app.name}</div>
          <h1 className="canvas__title">{record.flow.name}</h1>
        </div>
        <div className="canvas__toolbar">
          <button className="canvas__toolbar-button is-primary" type="button">
            Run
          </button>
          <button className="canvas__toolbar-button" type="button">
            Debug
          </button>
          <button className="canvas__toolbar-button" type="button">
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

      <div className="flow-step-list">
        {visibleNodes.map((node, index) => (
          <article key={node.id} className="flow-step-card">
            <div className="flow-step-card__index">{String(index + 1).padStart(2, "0")}</div>
            <div className="flow-step-card__content">
              <div className="flow-step-card__header">
                <div>
                  <h3>{node.name}</h3>
                  <p>{node.description ?? "No step description yet."}</p>
                </div>
                <span className={`flow-step-card__kind kind-${node.kind}`}>{node.kind}</span>
              </div>
              <div className="flow-step-card__meta">
                {renderNodeMeta(node)}
              </div>
            </div>
          </article>
        ))}
      </div>
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
