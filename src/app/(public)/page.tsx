import { HybridAppFrame } from "@/features/public-site/components/hybrid-app-frame";
import { PublicHero } from "@/features/public-site/components/public-hero";

export default function HomePage() {
  return (
    <>
      <PublicHero />
      <div className="page-grid">
        <HybridAppFrame />
      </div>
    </>
  );
}
