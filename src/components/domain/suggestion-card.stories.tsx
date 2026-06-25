import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SuggestionCard } from "@/components/domain/suggestion-card";

const meta = {
  component: SuggestionCard,
  parameters: {
    docs: {
      description: {
        component:
          "에이전트가 만든 값은 확정 데이터가 아니라 후보입니다. 승인 전에는 실제 작업, WBS, 일정으로 반영하지 않습니다.",
      },
    },
  },
  title: "Domain/SuggestionCard",
} satisfies Meta<typeof SuggestionCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AgentCandidates: Story = {
  args: {
    description: "후보 설명",
    source: "자료",
    title: "후보",
  },
  render: () => (
    <div style={{ display: "grid", gap: 14, width: 520 }}>
      <SuggestionCard
        confidence={92}
        description="계약서와 회의록의 납품일 표현이 다릅니다. 사용자가 기준 날짜를 확인해야 합니다."
        source="번역계약서_v2.pdf · 회의록_0618.md"
        title="납품일 확인 필요"
      />
      <SuggestionCard
        confidence={84}
        description="요구사항 문서의 용어집 정리를 WBS 하위 작업 후보로 제안합니다."
        source="요구사항_초안.docx"
        title="용어집 초안 정리"
      />
    </div>
  ),
};
