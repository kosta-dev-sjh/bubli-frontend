import { GlassPanel } from "@/components/ui/glass-panel";

type PlaceholderPanelProps = {
  title: string;
  description: string;
};

export function PlaceholderPanel({ title, description }: PlaceholderPanelProps) {
  return (
    <GlassPanel className="bubli-domain-card">
      <h2 className="bubli-domain-card__title">{title}</h2>
      <p className="bubli-domain-card__body">{description}</p>
    </GlassPanel>
  );
}
