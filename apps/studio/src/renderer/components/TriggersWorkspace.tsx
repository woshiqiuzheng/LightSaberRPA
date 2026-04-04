import type { StudioTaskRecord } from "../types";

interface TriggersWorkspaceProps {
  tasks: StudioTaskRecord[];
}

export function TriggersWorkspace({ tasks }: TriggersWorkspaceProps) {
  return (
    <section className="workspace-card">
      <div className="section-header">
        <div>
          <h2>Triggers</h2>
          <div className="section-header__caption">
            Schedule flows, listen for file changes, and review trigger bindings.
          </div>
        </div>
        <div className="search-chip">Search triggers</div>
      </div>

      <div className="trigger-summary-grid">
        <article className="trigger-summary-card">
          <span className="trigger-summary-card__label">Total bindings</span>
          <strong>{tasks.length}</strong>
          <p>File, schedule, and manual triggers connected to local flows.</p>
        </article>
        <article className="trigger-summary-card">
          <span className="trigger-summary-card__label">Enabled</span>
          <strong>{tasks.filter((task) => task.enabled).length}</strong>
          <p>Currently active tasks that the local runner can pick up.</p>
        </article>
      </div>

      <div className="trigger-table">
        <div className="trigger-table__head">
          <span>Name</span>
          <span>Type</span>
          <span>App</span>
          <span>Status</span>
        </div>

        {tasks.map((task) => (
          <article key={task.id} className="trigger-row">
            <div>
              <strong>{task.name}</strong>
              <p>{task.condition}</p>
            </div>
            <span>{task.trigger}</span>
            <span>{task.app}</span>
            <span className={`trigger-pill ${task.enabled ? "is-on" : "is-off"}`}>
              {task.enabled ? "Enabled" : "Disabled"}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
