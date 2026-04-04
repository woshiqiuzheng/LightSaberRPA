import type { NavItem } from "../types";

interface TopBarProps {
  items: NavItem[];
  runtimeLabel: string;
}

export function TopBar({ items, runtimeLabel }: TopBarProps) {
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
        {items.map((item, index) => (
          <button key={item.id} className={`topbar__nav-item${index === 0 ? " is-active" : ""}`} type="button">
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
