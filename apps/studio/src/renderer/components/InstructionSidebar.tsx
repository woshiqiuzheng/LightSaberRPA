import type { InstructionGroup } from "../types";

interface InstructionSidebarProps {
  groups: InstructionGroup[];
}

export function InstructionSidebar({ groups }: InstructionSidebarProps) {
  return (
    <aside className="instruction-sidebar">
      <div className="instruction-sidebar__search">
        <span className="instruction-sidebar__search-icon">S</span>
        <input aria-label="Search instructions" placeholder="Search instructions" type="search" />
      </div>

      <div className="instruction-sidebar__tabs">
        <button className="instruction-sidebar__tab is-active" type="button">
          Built-in
        </button>
        <button className="instruction-sidebar__tab" type="button">
          Custom
        </button>
      </div>

      <div className="instruction-sidebar__group-list">
        {groups.map((group) => (
          <button key={group.id} className="instruction-group-card" type="button">
            <div className="instruction-group-card__head">
              <span className="instruction-group-card__label">{group.label}</span>
              <span className="instruction-group-card__arrow">&gt;</span>
            </div>
            <div className="instruction-group-card__desc">{group.description}</div>
            <div className="instruction-group-card__tags">
              {group.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
