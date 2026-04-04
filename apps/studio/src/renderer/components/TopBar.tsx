import type { NavItem, NavSectionId } from "../types";

interface TopBarProps {
  items: NavItem[];
  activeItemId: NavSectionId;
  onSelect: (id: NavSectionId) => void;
  runtimeLabel: string;
}

export function TopBar({ items, activeItemId, onSelect, runtimeLabel }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar__brand">
        <div className="topbar__logo">LS</div>
        <div>
          <div className="topbar__title">LightSaberRPA</div>
          <div className="topbar__subtitle">Desktop automation studio</div>
        </div>
      </div>

      <nav className="topbar__nav" aria-label="Primary">
        {items.map((item) => (
          <button
            key={item.id}
            className={`topbar__nav-item${item.id === activeItemId ? " is-active" : ""}`}
            onClick={() => onSelect(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="topbar__actions">
        <button className="ghost-button" type="button">
          {runtimeLabel}
        </button>
        <button className="ghost-button" type="button">
          Learning Center
        </button>
        <button className="avatar-button" type="button" aria-label="User menu">
          Q
        </button>
      </div>
    </header>
  );
}
