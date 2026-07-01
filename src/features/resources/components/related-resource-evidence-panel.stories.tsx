import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { RelatedResourceEvidencePanel } from "@/features/resources/components/related-resource-evidence-panel";

const meta = {
  component: RelatedResourceEvidencePanel,
  parameters: {
    docs: {
      description: {
        component:
          "자료 상세에서 현재 자료와 관련 있는 문서를 보여주는 패널입니다. 의미 검색 결과라도 올린 사람, 프로젝트룸, 자료 범위 권한 기준을 통과한 자료만 후보로 표시합니다.",
      },
    },
    layout: "fullscreen",
  },
  title: "Features/Resources/RelatedResourceEvidencePanel",
} satisfies Meta<typeof RelatedResourceEvidencePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const RelatedEvidence: Story = {
  render: (args) => (
    <main style={{ minHeight: "100vh", padding: 32 }}>
      <RelatedResourceEvidencePanel {...args} />
    </main>
  ),
};

export const PersonalResourceContext: Story = {
  args: {
    currentResourceTitle: "개인_검토메모.txt",
    relatedResources: [
      {
        id: "resource-contract-v2",
        reason: "MENTIONS_DELIVERABLE",
        score: 87,
        summary: "납품물과 검수 기준이 연결되는 프로젝트룸 자료입니다.",
        title: "작업범위_v2.pdf",
        updatedLabel: "2026-06-17",
        visibility: "ROOM_SHARED",
      },
      {
        id: "resource-private-note",
        reason: "SAME_SCOPE",
        score: 82,
        summary: "사용자 개인 메모입니다. 직접 공유하기 전까지 프로젝트룸에 보이지 않습니다.",
        title: "작업_메모_0618.md",
        updatedLabel: "2026-06-18",
        visibility: "PERSONAL",
      },
    ],
  },
  render: (args) => (
    <main style={{ minHeight: "100vh", padding: 32 }}>
      <RelatedResourceEvidencePanel {...args} />
    </main>
  ),
};
