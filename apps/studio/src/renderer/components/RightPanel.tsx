import type { ResourceStat, StudioAppRecord, StudioTaskRecord } from "../types";

interface RightPanelProps {
  record: StudioAppRecord;
  stats: ResourceStat[];
  tasks: StudioTaskRecord[];
}

export function RightPanel({ record, stats, tasks }: RightPanelProps) {
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
