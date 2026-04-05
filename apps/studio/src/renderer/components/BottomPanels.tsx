import type { BottomPanelRecord } from "../types";

interface BottomPanelsProps {
  panels: BottomPanelRecord[];
}

export function BottomPanels({ panels }: BottomPanelsProps) {
  return (
    <section className="bottom-panels">
      {panels.map((panel) => (
        <article key={panel.id} className="bottom-panel">
          <div className="bottom-panel__head">
            <div className="bottom-panel__title">{panel.label}</div>
            <div className="bottom-panel__status">{panel.status}</div>
          </div>
          <div className="bottom-panel__body">
            <div className="bottom-panel__list">
              {panel.items.map((item, index) => (
                <div key={`${panel.id}-${index}`} className="bottom-panel__list-item">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
