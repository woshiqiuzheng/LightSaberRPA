interface PlaceholderWorkspaceProps {
  sectionLabel: string;
}

export function PlaceholderWorkspace({ sectionLabel }: PlaceholderWorkspaceProps) {
  return (
    <section className="workspace-card workspace-card--placeholder">
      <div className="workspace-placeholder">
        <div className="workspace-placeholder__badge">{sectionLabel.slice(0, 2).toUpperCase()}</div>
        <h2>{sectionLabel}</h2>
        <p>
          This section is reserved for the next milestone. Marketplace data, guides, and
          community surfaces will land here after the core editor and trigger workflows settle.
        </p>
      </div>
    </section>
  );
}
