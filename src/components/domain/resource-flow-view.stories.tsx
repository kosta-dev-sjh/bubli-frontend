import { useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ResourceFlowView, type ResourceFlowData } from "@/components/domain/resource-flow-view";
import { ThemeProvider } from "@/components/theme";

const meta = {
  tags: ["uikit", "domain"],
  component: ResourceFlowView,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "자료 → 에이전트 후보 → 승인·근거 → 오늘 할 일 흐름을 새 UI Kit으로 조립. 이 파일 안의 샘플 데이터만 사용한다.",
      },
    },
  },
  title: "Domain/ResourceFlowView",
} satisfies Meta<typeof ResourceFlowView>;

export default meta;
type Story = StoryObj<typeof meta>;

const frame = { padding: 24, maxWidth: 1180 } as const;

const storyResourceFlow: ResourceFlowData = {
  resources: [
    {
      description: "메인, 상세, 마이페이지 개편 범위와 검수 기준이 들어 있습니다.",
      id: "r1",
      meta: "PDF · 2.4MB",
      ownerLabel: "Bubli 제품 개발룸",
      relatedCount: 3,
      scope: "room",
      status: "needsReview",
      title: "A사 리뉴얼 요구사항 정의서.pdf",
      updatedLabel: "오늘 10:24",
    },
    {
      description: "화면 흐름과 정보 구조가 정리된 시안입니다.",
      id: "r2",
      meta: "Figma · A사 룸",
      ownerLabel: "Bubli 제품 개발룸",
      relatedCount: 5,
      scope: "room",
      status: "candidate",
      title: "B사 앱 와이어프레임.fig",
      updatedLabel: "어제 18:12",
    },
    {
      description: "외부 공유 전 정리 중인 견적 기준 메모입니다.",
      id: "r3",
      meta: "Markdown · 개인",
      ownerLabel: "개인 자료",
      relatedCount: 1,
      scope: "personal",
      status: "normal",
      title: "내 견적 메모.md",
      updatedLabel: "3일 전",
    },
  ],
  suggestions: [
    {
      confidence: 82,
      description: "요구사항 정의서 2장에서 메인 배너 개편 범위와 검수 기준을 찾았습니다.",
      id: "s1",
      resourceId: "r1",
      source: "2장 화면 범위",
      status: "pending",
      title: "메인 배너 영역 개편",
    },
    {
      confidence: 74,
      description: "마이페이지 IA 변경 근거가 와이어프레임 3, 4페이지에 있습니다.",
      id: "s2",
      resourceId: "r2",
      source: "와이어프레임 3-4페이지",
      status: "held",
      title: "마이페이지 정보 구조 변경",
    },
    {
      confidence: 90,
      description: "정의서 5장과 개인 메모가 같은 결제 흐름 단순화를 가리킵니다.",
      id: "s3",
      resourceId: "r1",
      source: "정의서 5장 + 메모",
      status: "approved",
      title: "결제 흐름 단순화",
    },
  ],
  works: [
    { dueLabel: "오늘 18:00", id: "w1", sourceLabel: "후보 승인", status: "doing", title: "메인 배너 시안 1차" },
    { dueLabel: "내일", id: "w2", sourceLabel: "후보 보류", status: "waiting", title: "마이페이지 IA 정리" },
    { id: "w3", sourceLabel: "후보 승인", status: "review", title: "결제 흐름 검토 회신" },
  ],
};

export const Default: Story = {
  render: () => (
    <div style={frame}>
      <ResourceFlowView data={storyResourceFlow} />
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <div style={frame}>
      <ResourceFlowView loading />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div style={{ ...frame, maxWidth: 520 }}>
      <ResourceFlowView empty />
    </div>
  ),
};

export const Error: Story = {
  render: () => (
    <div style={{ ...frame, maxWidth: 520 }}>
      <ResourceFlowView error />
    </div>
  ),
};

function DarkPreview({ children }: { children: ReactNode }) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  return (
    <div ref={setEl} style={{ ...frame, background: "#161E2E", borderRadius: 24 }}>
      {el ? (
        <ThemeProvider attributeTarget={el} defaultTheme="dark" enableStorage={false}>
          {children}
        </ThemeProvider>
      ) : null}
    </div>
  );
}

export const Dark: Story = {
  parameters: { backgrounds: { default: "dark" } },
  render: () => (
    <DarkPreview>
      <ResourceFlowView data={storyResourceFlow} />
    </DarkPreview>
  ),
};
