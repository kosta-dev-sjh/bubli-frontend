import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ResourceVersionDecisionPanel } from "@/features/resources/components/resource-version-decision-panel";

const meta = {
  argTypes: {
    onChooseDecision: { action: "choose version decision" },
    onOpenCurrent: { action: "open current resource" },
    onOpenIncoming: { action: "open incoming resource" },
  },
  component: ResourceVersionDecisionPanel,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 1120 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "같은 자료를 다시 올리거나 로컬 관리 폴더에서 변경 파일을 감지했을 때, 사용자가 새 버전 등록 여부를 고르는 패널입니다. 선택 전에는 현재 자료와 분석 기준을 유지합니다.",
      },
    },
  },
  title: "Features/Resources/ResourceVersionDecisionPanel",
} satisfies Meta<typeof ResourceVersionDecisionPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ProjectRoomResourceVersion: Story = {
  args: {
    currentFileName: "요구사항정의서_v1.3.pdf",
    incomingFileName: "요구사항정의서_v1.4.pdf",
    visibility: "ROOM_SHARED",
  },
};

export const PersonalResourceVersion: Story = {
  args: {
    currentFileName: "개인_계약검토_메모.md",
    incomingFileName: "개인_계약검토_메모_수정.md",
    versions: [
      {
        authorLabel: "김정현",
        changedAtLabel: "2026-06-18 21:10",
        fileName: "개인_계약검토_메모.md",
        id: "personal-current",
        note: "개인 자료함에서만 보이는 현재 메모입니다.",
        status: "CURRENT",
        versionLabel: "v2",
      },
      {
        authorLabel: "김정현",
        changedAtLabel: "2026-06-17 18:04",
        fileName: "개인_계약검토_초안.md",
        id: "personal-prev",
        note: "프로젝트룸에 공유하지 않은 개인 검토 초안입니다.",
        status: "PREVIOUS",
        versionLabel: "v1",
      },
    ],
    visibility: "PERSONAL",
  },
};
