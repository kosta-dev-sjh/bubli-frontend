import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { RequirementCandidateReviewPanel } from "@/features/agent/components/requirement-candidate-review-panel";

const meta = {
  component: RequirementCandidateReviewPanel,
  parameters: {
    docs: {
      description: {
        component:
          "요구사항 문서에서 나온 기능, 화면, 권한, 데이터, 연동, 지원 환경 후보를 검토하는 패널입니다. 승인된 후보만 WBS와 TODO 후보 생성의 근거로 이어집니다.",
      },
    },
    layout: "fullscreen",
  },
  title: "Features/Agent/RequirementCandidateReviewPanel",
} satisfies Meta<typeof RequirementCandidateReviewPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ReviewQueue: Story = {
  render: (args) => (
    <main style={{ minHeight: "100vh", padding: 32 }}>
      <RequirementCandidateReviewPanel {...args} />
    </main>
  ),
};

export const ApprovedSet: Story = {
  args: {
    candidates: [
      {
        category: "FEATURE",
        confidence: 93,
        description: "사용자가 번역 파일을 업로드하면 원문, 번역본, 검수 질문을 같은 프로젝트룸 자료로 묶어야 합니다.",
        id: "candidate-feature-resource-group",
        sourceLabel: "요구사항정의서_v1.3.pdf 3쪽",
        status: "APPROVED",
        title: "번역 자료 묶음 관리",
      },
      {
        category: "SCREEN",
        confidence: 88,
        description: "자료 상세에서 요약, 확인 필요 항목, 관련 문서, 후보 목록을 한 번에 검토할 수 있어야 합니다.",
        id: "candidate-screen-resource-detail",
        sourceLabel: "회의록_0618.md",
        status: "APPROVED",
        title: "자료 상세 검토 화면",
      },
      {
        category: "INTEGRATION",
        confidence: 81,
        description: "구글 캘린더 일정은 읽기 중심으로 가져오고, Bubli 일정과 같은 화면에서 구분해 보여줍니다.",
        id: "candidate-integration-calendar",
        sourceLabel: "요구사항정의서_v1.3.pdf 8쪽",
        status: "DRAFT",
        title: "캘린더 일정 표시",
      },
      {
        category: "ENVIRONMENT",
        confidence: 77,
        description: "Tauri 앱에서는 작업공간을 감싸고, 위젯과 로컬 기능은 별도 앱 기능으로 제공합니다.",
        id: "candidate-env-tauri",
        sourceLabel: "회의록_0618.md",
        status: "APPROVED",
        title: "Tauri 앱 실행 기준",
      },
    ],
    jobStatusLabel: "검토 가능",
  },
  render: (args) => (
    <main style={{ minHeight: "100vh", padding: 32 }}>
      <RequirementCandidateReviewPanel {...args} />
    </main>
  ),
};
