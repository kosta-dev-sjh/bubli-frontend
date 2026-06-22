type PageHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function PageHeading({ eyebrow, title, description }: PageHeadingProps) {
  return (
    <section>
      {eyebrow ? (
        <p style={{ color: "var(--color-brand)", fontWeight: 700, margin: "0 0 8px" }}>
          {eyebrow}
        </p>
      ) : null}
      <h1 style={{ fontSize: 44, lineHeight: 1.08, margin: 0 }}>{title}</h1>
      {description ? (
        <p className="muted" style={{ fontSize: 18, lineHeight: 1.7, maxWidth: 720 }}>
          {description}
        </p>
      ) : null}
    </section>
  );
}
