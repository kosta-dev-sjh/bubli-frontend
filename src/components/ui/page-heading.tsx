import { SectionHeading } from "@/components/ui/section-heading";

type PageHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function PageHeading({ eyebrow, title, description }: PageHeadingProps) {
  return <SectionHeading description={description} eyebrow={eyebrow} title={title} />;
}
