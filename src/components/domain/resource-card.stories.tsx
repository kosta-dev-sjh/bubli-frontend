import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ResourceCard } from "@/components/domain/resource-card";

const meta = {
  component: ResourceCard,
  parameters: {
    docs: {
      description: {
        component:
          "자료보드에서 개인 자료와 프로젝트룸 자료를 구분합니다. 개인 자료는 사용자가 공유하기 전까지 프로젝트룸 자료로 보이지 않습니다.",
      },
    },
  },
  title: "Domain/ResourceCard",
} satisfies Meta<typeof ResourceCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ResourceScopes: Story = {
  args: {
    meta: "프로젝트룸 자료",
    scope: "room",
    title: "회의록_0618.md",
  },
  render: () => (
    <div style={{ display: "grid", gap: 14, width: 520 }}>
      <ResourceCard
        description="검수 기준과 중간보고 일정이 들어 있어 프로젝트룸 에이전트가 후보를 만들 수 있는 자료입니다."
        meta="프로젝트룸 자료 · v3 · 댓글 4"
        relatedCount={3}
        scope="room"
        status="needsReview"
        title="회의록_0618.md"
      />
      <ResourceCard
        description="개인 관리 폴더에서 감지된 메모입니다. 프로젝트룸 공유는 사용자가 직접 승인해야 합니다."
        meta="개인 자료 · 공유 전 · 관리 폴더에서 감지"
        relatedCount={1}
        scope="personal"
        status="candidate"
        title="개인_검토메모.txt"
      />
    </div>
  ),
};
