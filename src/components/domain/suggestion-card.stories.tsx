import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SuggestionCard } from "@/components/domain/suggestion-card";

const meta = {
  tags: ["uikit", "domain"],
  args: { description: "후보 설명", source: "자료", title: "후보" },
  component: SuggestionCard,
  parameters: {
    docs: {
      description: {
        component:
          "에이전트 후보 카드. 값은 확정이 아니라 후보 — 승인 전에는 반영하지 않는다(승인형 UX). 에이전트 신호는 Opal Lilac, 근거는 evidence chip, 액션은 Button UI Kit. 카드 전체를 색으로 칠하지 않는다.",
      },
    },
  },
  title: "Domain/SuggestionCard",
} satisfies Meta<typeof SuggestionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const wrap = { display: "grid", gap: 14, width: 480 } as const;

export const Pending: Story = {
  render: () => (
    <div style={wrap}>
      <SuggestionCard
        confidence={92}
        description="기준 자료와 회의록의 납품일 표현이 다릅니다. 기준 날짜를 확인해야 합니다."
        source="작업범위_v2.pdf · 회의록_0618.md"
        status="pending"
        title="납품일 확인 필요"
      />
    </div>
  ),
};

export const WithEvidence: Story = {
  render: () => (
    <div style={wrap}>
      <SuggestionCard
        confidence={88}
        description="요구사항 문서의 용어집 정리를 WBS 하위 작업 후보로 제안합니다."
        source="요구사항_초안.docx · 기준 자료 p.3"
        status="pending"
        title="용어집 초안 정리"
      />
    </div>
  ),
};

export const Approved: Story = {
  render: () => (
    <div style={wrap}>
      <SuggestionCard confidence={92} description="승인되어 오늘 할 일로 반영되었습니다." source="작업범위_v2.pdf" status="approved" title="납품일 확인" />
    </div>
  ),
};

export const Held: Story = {
  render: () => (
    <div style={wrap}>
      <SuggestionCard description="보류된 후보입니다. 사용자가 다시 확인할 수 있습니다." source="요구사항_초안.docx" status="held" title="용어집 초안 정리" />
    </div>
  ),
};

export const Rejected: Story = {
  render: () => (
    <div style={wrap}>
      <SuggestionCard className="bubli-domain-card--disabled" description="거절된 후보입니다." source="요구사항_초안.docx" status="held" title="중복 작업 후보" />
    </div>
  ),
};

export const Thinking: Story = {
  render: () => (
    <div style={wrap}>
      <SuggestionCard confidence={0} description="자료를 읽고 후보를 정리하고 있어요…" source="기준 자료_최종.pdf 분석 중" status="pending" title="후보 생성 중" />
    </div>
  ),
};

function DarkFrame({ children }: { children: ReactNode }) {
  return (
    <div data-theme="dark" style={{ background: "#161E2E", borderRadius: 20, padding: 24, width: 500 }}>
      {children}
    </div>
  );
}

export const Dark: Story = {
  parameters: { backgrounds: { default: "dark" } },
  render: () => (
    <DarkFrame>
      <SuggestionCard
        confidence={92}
        description="기준 자료와 회의록의 납품일 표현이 다릅니다. 기준 날짜를 확인해야 합니다."
        source="작업범위_v2.pdf · 회의록_0618.md"
        status="pending"
        title="납품일 확인 필요"
      />
    </DarkFrame>
  ),
};
