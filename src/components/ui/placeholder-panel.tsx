type PlaceholderPanelProps = {
  title: string;
  description: string;
};

export function PlaceholderPanel({ title, description }: PlaceholderPanelProps) {
  return (
    <section className="glass-panel" style={{ padding: 24 }}>
      <h2 style={{ margin: 0 }}>{title}</h2>
      <p className="muted" style={{ lineHeight: 1.7, marginBottom: 0 }}>
        {description}
      </p>
    </section>
  );
}
