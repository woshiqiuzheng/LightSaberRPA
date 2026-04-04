import type { NavItem, NavSectionId } from "../types";

interface SidebarProps {
  items: NavItem[];
  activeItemId: NavSectionId;
  onSelect: (id: NavSectionId) => void;
  onCreateApp?: () => void;
}

export function Sidebar({ items, activeItemId, onCreateApp, onSelect }: SidebarProps) {
  return (
    <aside className="sidebar">
      <button className="primary-button" onClick={onCreateApp} type="button">
        + New
      </button>

      <section className="sidebar__section">
        <div className="sidebar__section-title">Workspace</div>
        <div className="sidebar__menu">
          {items.map((item) => (
            <button
              key={item.id}
              className={`sidebar__menu-item${item.id === activeItemId ? " is-active" : ""}`}
              onClick={() => onSelect(item.id)}
              type="button"
            >
              <span>{item.label}</span>
              {item.count ? <span className="sidebar__badge">{item.count}</span> : null}
            </button>
          ))}
        </div>
      </section>

      <section className="sidebar__section sidebar__section--muted">
        <div className="sidebar__section-title">Custom Instructions</div>
        <div className="sidebar__menu">
          <button className="sidebar__menu-item" type="button">
            Instructions I built
          </button>
        </div>
      </section>

      <div className="sidebar__footer">
        <div className="sidebar__upgrade">Upgrade to business</div>
        <button className="link-button" type="button">
          Apply
        </button>
      </div>
    </aside>
  );
}
