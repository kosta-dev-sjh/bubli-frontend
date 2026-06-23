import { PublicHomeFlow } from "@/features/public-site/components/public-home-flow";
import { PublicHero } from "@/features/public-site/components/public-hero";

export default function HomePage() {
  return (
    <>
      <PublicHero />
      <div className="page-grid">
        <PublicHomeFlow />
      </div>
    </>
  );
}
