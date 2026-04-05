import { useEffect, useState } from "react";

import type { StudioTaskRecord, TriggerDraftInput } from "../types";

interface TriggersWorkspaceProps {
  apps: Array<{
    id: string;
    name: string;
  }>;
  onCreateTask: (draft: TriggerDraftInput) => void;
  onToggleTaskEnabled: (taskId: string) => void;
  tasks: StudioTaskRecord[];
}

export function TriggersWorkspace({
  apps,
  onCreateTask,
  onToggleTaskEnabled,
  tasks
}: TriggersWorkspaceProps) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [draftName, setDraftName] = useState("New trigger");
  const [draftTrigger, setDraftTrigger] = useState("File trigger");
  const [draftAppId, setDraftAppId] = useState(apps[0]?.id ?? "");
  const [draftCondition, setDraftCondition] = useState(
    "Watch D:/watch for new files and run the selected app."
  );
  const [draftDirectory, setDraftDirectory] = useState("D:/watch");
  const [draftPattern, setDraftPattern] = useState("*.txt");
  const [draftRecursive, setDraftRecursive] = useState(true);
  const [draftEnabled, setDraftEnabled] = useState(true);

  useEffect(() => {
    if (!draftAppId && apps[0]?.id) {
      setDraftAppId(apps[0].id);
    }
  }, [apps, draftAppId]);

  useEffect(() => {
    if (draftTrigger === "File trigger") {
      setDraftCondition(
        `Watch ${draftDirectory || "D:/watch"} for ${draftPattern || "*"} changes and run the selected app.`
      );
    }
  }, [draftDirectory, draftPattern, draftTrigger]);

  function handleCreate() {
    if (!draftName.trim() || !draftCondition.trim() || !draftAppId) {
      return;
    }

    onCreateTask({
      appId: draftAppId,
      name: draftName.trim(),
      trigger: draftTrigger,
      condition: draftCondition.trim(),
      enabled: draftEnabled,
      config:
        draftTrigger === "File trigger"
          ? {
              directory: draftDirectory.trim(),
              filePattern: draftPattern.trim(),
              recursive: draftRecursive,
              eventTypes: ["rename", "change"]
            }
          : undefined
    });

    setDraftName(`New trigger ${tasks.length + 1}`);
    setDraftTrigger("File trigger");
    setDraftCondition("Watch D:/watch for new files and run the selected app.");
    setDraftDirectory("D:/watch");
    setDraftPattern("*.txt");
    setDraftRecursive(true);
    setDraftEnabled(true);
    setIsComposerOpen(false);
  }

  return (
    <section className="workspace-card">
      <div className="section-header">
        <div>
          <h2>Triggers</h2>
          <div className="section-header__caption">
            Schedule flows, listen for file changes, and review trigger bindings.
          </div>
        </div>
        <div className="trigger-toolbar">
          <div className="search-chip">Search triggers</div>
          <button className="primary-button trigger-toolbar__button" onClick={() => setIsComposerOpen((current) => !current)} type="button">
            {isComposerOpen ? "Close" : "+ New Trigger"}
          </button>
        </div>
      </div>

      {isComposerOpen ? (
        <div className="trigger-composer">
          <div className="trigger-composer__grid">
            <label className="form-field">
              <span className="form-field__label">Name</span>
              <input onChange={(event) => setDraftName(event.target.value)} type="text" value={draftName} />
            </label>

            <label className="form-field">
              <span className="form-field__label">Trigger type</span>
              <select
                className="trigger-composer__select"
                onChange={(event) => setDraftTrigger(event.target.value)}
                value={draftTrigger}
              >
                <option>File trigger</option>
                <option>Schedule</option>
                <option>Manual</option>
              </select>
            </label>

            <label className="form-field">
              <span className="form-field__label">App</span>
              <select
                className="trigger-composer__select"
                onChange={(event) => setDraftAppId(event.target.value)}
                value={draftAppId}
              >
                {apps.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="checkbox-field">
              <input
                checked={draftEnabled}
                onChange={(event) => setDraftEnabled(event.target.checked)}
                type="checkbox"
              />
              <span>
                <strong>Enable immediately</strong>
                <small>The local runner can pick this up right away.</small>
              </span>
            </label>
          </div>

          {draftTrigger === "File trigger" ? (
            <div className="trigger-composer__grid">
              <label className="form-field">
                <span className="form-field__label">Directory</span>
                <input
                  onChange={(event) => setDraftDirectory(event.target.value)}
                  type="text"
                  value={draftDirectory}
                />
              </label>

              <label className="form-field">
                <span className="form-field__label">File pattern</span>
                <input
                  onChange={(event) => setDraftPattern(event.target.value)}
                  type="text"
                  value={draftPattern}
                />
              </label>

              <label className="checkbox-field">
                <input
                  checked={draftRecursive}
                  onChange={(event) => setDraftRecursive(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <strong>Include subfolders</strong>
                  <small>Register the watcher in recursive mode when supported.</small>
                </span>
              </label>
            </div>
          ) : null}

          <label className="form-field">
            <span className="form-field__label">Condition</span>
            <textarea
              onChange={(event) => setDraftCondition(event.target.value)}
              rows={3}
              value={draftCondition}
            />
          </label>

          <div className="trigger-composer__actions">
            <button className="ghost-button" onClick={() => setIsComposerOpen(false)} type="button">
              Cancel
            </button>
            <button className="primary-button trigger-toolbar__button" onClick={handleCreate} type="button">
              Create trigger
            </button>
          </div>
        </div>
      ) : null}

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
            <button
              className={`trigger-pill ${task.enabled ? "is-on" : "is-off"}`}
              onClick={() => onToggleTaskEnabled(task.id)}
              type="button"
            >
              {task.enabled ? "Enabled" : "Disabled"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
