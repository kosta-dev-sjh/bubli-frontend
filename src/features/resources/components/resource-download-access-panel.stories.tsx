import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ResourceDownloadAccessPanel } from "@/features/resources/components/resource-download-access-panel";

const meta = {
  argTypes: {
    onDownload: { action: "download resource file" },
    onRefreshUrl: { action: "refresh download url" },
  },
  component: ResourceDownloadAccessPanel,
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
          "자료 상세에서 파일을 내려받기 전 권한 확인 상태를 보여주는 패널입니다. 파일 저장소를 직접 열지 않고 API 서버가 사용자와 자료 접근 권한을 확인한 뒤 다운로드 주소를 발급한다는 기준을 반영합니다.",
      },
    },
  },
  title: "Features/Resources/ResourceDownloadAccessPanel",
} satisfies Meta<typeof ResourceDownloadAccessPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ReadyForProjectRoomResource: Story = {
  args: {
    accessScope: "ROOM_SHARED",
    status: "READY",
  },
};

export const NonMemberBlocked: Story = {
  args: {
    accessScope: "ROOM_SHARED",
    checks: [
      {
        description: "로그인했지만 프로젝트룸 멤버가 아니므로 자료 접근을 막습니다.",
        id: "auth",
        label: "회원 인증",
        status: "BLOCKED",
      },
      {
        description: "자료 접근은 ACTIVE 프로젝트룸 멤버에게만 허용됩니다.",
        id: "resource-scope",
        label: "자료 접근 권한",
        status: "BLOCKED",
      },
      {
        description: "권한 확인이 막혀 다운로드 주소를 만들지 않습니다.",
        id: "download-url",
        label: "다운로드 주소 발급",
        status: "PENDING",
      },
    ],
    file: {
      checksumLabel: "파일 지문 대기",
      fileName: "요구사항정의서_v1.3.pdf",
      mimeLabel: "PDF",
      sizeLabel: "3.1 MB",
      updatedLabel: "2026-06-18 10:40",
    },
    status: "DENIED",
  },
};

export const ExpiredPersonalResourceUrl: Story = {
  args: {
    accessScope: "PERSONAL",
    expiresLabel: "이미 만료됨",
    file: {
      checksumLabel: "파일 지문 확인됨",
      fileName: "개인_계약검토_메모.md",
      mimeLabel: "Markdown",
      sizeLabel: "18 KB",
      updatedLabel: "2026-06-18 21:10",
    },
    status: "EXPIRED",
  },
};
