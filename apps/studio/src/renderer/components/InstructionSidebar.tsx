import { useMemo, useState } from "react";

import type { InstructionGroup, InstructionPaletteEntry } from "../types";

interface InstructionSidebarProps {
  disabled?: boolean;
  groups: InstructionGroup[];
  selectedNodeLabel?: string;
  onInsertInstruction: (instruction: InstructionPaletteEntry) => void;
}

export function InstructionSidebar({
  disabled,
  groups,
  selectedNodeLabel,
  onInsertInstruction
}: InstructionSidebarProps) {
  const [searchValue, setSearchValue] = useState("");

  const filteredGroups = useMemo(() => {
    const normalizedQuery = searchValue.trim().toLowerCase();

    if (!normalizedQuery) {
      return groups;
    }

    return groups
      .map((group) => {
        const matchesGroup =
          group.label.toLowerCase().includes(normalizedQuery) ||
          group.description.toLowerCase().includes(normalizedQuery) ||
          group.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));

        return {
          ...group,
          instructions: matchesGroup
            ? group.instructions
            : group.instructions.filter((instruction) => {
                const haystack = [
                  instruction.name,
                  instruction.description,
                  instruction.id,
                  ...(instruction.tags ?? [])
                ]
                  .join(" ")
                  .toLowerCase();

                return haystack.includes(normalizedQuery);
              })
        };
      })
      .filter((group) => group.instructions.length > 0);
  }, [groups, searchValue]);

  return (
    <aside className="instruction-sidebar">
      <div className="instruction-sidebar__search">
        <span className="instruction-sidebar__search-icon">S</span>
        <input
          aria-label="Search instructions"
          disabled={disabled}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search instructions"
          type="search"
          value={searchValue}
        />
      </div>

      <div className="instruction-sidebar__tabs">
        <button className="instruction-sidebar__tab is-active" type="button">
          Built-in
        </button>
        <button className="instruction-sidebar__tab" type="button">
          Custom
        </button>
      </div>

      <div className="instruction-sidebar__context">
        Insert new steps after:
        <strong>{selectedNodeLabel ?? "the current cursor"}</strong>
      </div>

      <div className="instruction-sidebar__group-list">
        {filteredGroups.map((group) => (
          <section key={group.id} className="instruction-group-card">
            <div className="instruction-group-card__head">
              <span className="instruction-group-card__label">{group.label}</span>
              <span className="instruction-group-card__count">{group.instructions.length}</span>
            </div>
            <div className="instruction-group-card__desc">{group.description}</div>
            <div className="instruction-group-card__tags">
              {group.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>

            <div className="instruction-group-card__instructions">
              {group.instructions.map((instruction) => (
                <button
                  key={instruction.id}
                  className="instruction-card"
                  disabled={disabled}
                  onClick={() => onInsertInstruction(instruction)}
                  type="button"
                >
                  <div className="instruction-card__head">
                    <strong>{instruction.name}</strong>
                    <span>Add</span>
                  </div>
                  <p>{instruction.description}</p>
                  <div className="instruction-card__meta">
                    <span>{instruction.id}</span>
                    <span>{Object.keys(instruction.defaultConfig).length} config fields</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}

        {filteredGroups.length === 0 ? (
          <div className="instruction-sidebar__empty">
            No instructions match this search yet.
          </div>
        ) : null}
      </div>
    </aside>
  );
}
