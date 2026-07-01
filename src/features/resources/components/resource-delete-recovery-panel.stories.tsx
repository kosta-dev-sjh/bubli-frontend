import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ResourceDeleteRecoveryPanel } from "./resource-delete-recovery-panel";

const meta = {
  component: ResourceDeleteRecoveryPanel,
  parameters: {
    docs: {
      description: {
        component:
          "로컬 파일 삭제가 바로 서버 삭제로 이어지지 않고, 삭제 후보 확인 흐름을 거치는 자료 안전 패널입니다.",
      },
    },
  },
  title: "Features/Resources/ResourceDeleteRecoveryPanel",
} satisfies Meta<typeof ResourceDeleteRecoveryPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DeleteCandidates: Story = {
  args: {
    items: [
      {
        action: "keep",
        description: "개인 관리 폴더에서 사라졌지만 서버 자료는 삭제 후보로만 표시됩니다.",
        fileName: "요구사항_정의서_v1.3.pdf",
        meta: "DELETE_CANDIDATE · 개인 자료 · 2026-06-23 감지",
        status: "deleteCandidate",
      },
      {
        action: "archive",
        description: "프로젝트룸 자료보드에서는 숨기되, 버전 기록과 댓글 맥락은 남깁니다.",
        fileName: "회의록_초안_0618.md",
        meta: "ARCHIVED 후보 · 프로젝트룸 자료 · 댓글 2개",
        status: "blocked",
      },
      {
        action: "confirmDelete",
        description: "유지할 필요가 없다고 확인한 뒤에만 서버 반영을 진행합니다.",
        fileName: "중복_참고자료_old.docx",
        meta: "중복 후보 · 개인 자료 · 관련 문서 1개",
        status: "archived",
      },
    ],
    pendingCount: 3,
  },
};

export const KeptResource: Story = {
  args: {
    items: [
      {
        action: "archive",
        description: "유지하기로 선택한 자료는 다시 READY 상태로 표시하고, 필요한 경우 보관으로 옮길 수 있습니다.",
        fileName: "기준 자료_final.pdf",
        meta: "READY · 유지 선택 · 서버 자료 유지",
        status: "ready",
      },
    ],
    pendingCount: 0,
  },
};
