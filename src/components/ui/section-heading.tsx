import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type SectionHeadingProps = HTMLAttributes<HTMLElement> & {
  description?: string;
  eyebrow?: string;
  title: string;
};

export function SectionHeading({ className, description, eyebrow, title, ...props }: SectionHeadingProps) {
  return (
    <section className={cn("bubli-section-heading", className)} {...props}>
      {eyebrow ? <p className="bubli-section-heading__eyebrow">{eyebrow}</p> : null}
      <h1 className="bubli-section-heading__title">{title}</h1>
      {description ? <p className="bubli-section-heading__description">{description}</p> : null}
    </section>
  );
}
