import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ResourceUploadQueuePanel } from "@/features/resources/components/resource-upload-queue-panel";

const meta = {
  component: ResourceUploadQueuePanel,
  parameters: {
    docs: {
      description: {
        component:
          "자료 업로드와 개인 자료함 동기화 상태를 보여줍니다. 서버 업로드는 용량 제한과 권한 확인을 통과해야 하며, 프로젝트룸 자료 공유는 사용자의 별도 승인을 거칩니다.",
      },
    },
  },
  title: "Features/Resources/ResourceUploadQueuePanel",
} satisfies Meta<typeof ResourceUploadQueuePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ActiveUploadQueue: Story = {
  args: {
    items: [
      {
        fileName: "요구사항_정리_v1.docx",
        message: "파일 검증을 마치면 자료보드에 먼저 표시하고, 분석 작업은 에이전트 작업으로 이어집니다.",
        progress: 64,
        scope: "room",
        sizeLabel: "12.4MB",
        status: "uploading",
      },
      {
        fileName: "개인_검토메모.md",
        message: "개인 자료로 서버 반영 대기 중입니다. 프로젝트룸에는 아직 보이지 않습니다.",
        progress: 28,
        scope: "personal",
        sizeLabel: "320KB",
        status: "checking",
      },
      {
        fileName: "회의록_0619.pdf",
        message: "서버 자료로 반영됐습니다. 권한이 있는 사용자만 다운로드 주소를 받을 수 있습니다.",
        progress: 100,
        scope: "room",
        sizeLabel: "2.1MB",
        status: "ready",
      },
    ],
    limitLabel: "무료 기준 1GB",
    storageUsageLabel: "642MB 사용 중 · 382MB 남음",
    storageUsagePercent: 63,
  },
};

export const StorageLimitAndRetry: Story = {
  args: {
    items: [
      {
        fileName: "참고이미지_전체.zip",
        message: "개인 자료함 용량을 넘어서 서버 반영이 차단됐습니다. 로컬 색인은 유지됩니다.",
        progress: 0,
        scope: "personal",
        sizeLabel: "810MB",
        status: "blocked",
      },
      {
        fileName: "기준 자료_최종본.pdf",
        message: "전송 중 연결이 끊겼습니다. 같은 파일은 중복 생성하지 않고 실패 항목으로 남깁니다.",
        progress: 74,
        scope: "room",
        sizeLabel: "4.8MB",
        status: "failed",
      },
      {
        fileName: "작업범위_메모.txt",
        message: "다음 동기화 순서를 기다리고 있습니다.",
        progress: 0,
        scope: "personal",
        sizeLabel: "48KB",
        status: "queued",
      },
    ],
    limitLabel: "용량 초과",
    storageUsageLabel: "1.04GB 사용 중 · 서버 반영 차단",
    storageUsagePercent: 100,
  },
};
