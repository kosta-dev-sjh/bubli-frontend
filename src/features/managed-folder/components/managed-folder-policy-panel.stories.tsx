import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ManagedFolderPolicyPanel } from "./managed-folder-policy-panel";

const meta = {
  component: ManagedFolderPolicyPanel,
  parameters: {
    docs: {
      description: {
        component:
          "데스크탑 앱에서만 쓰는 개인 관리 폴더 상태 패널입니다. 사용자가 지정한 폴더만 색인하고, 서버 반영과 프로젝트룸 공유를 분리하는 기획 기준을 반영합니다.",
      },
    },
  },
  title: "Features/ManagedFolder/ManagedFolderPolicyPanel",
} satisfies Meta<typeof ManagedFolderPolicyPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SyncEnabled: Story = {
  args: {
    backupLabel: "마지막 로컬 백업 09:42",
    folderAlias: "~/Documents/Bubli",
    quotaLabel: "개인 자료함 820MB / 1GB",
    quotaPercent: 82,
    syncEnabled: true,
  },
};

export const LocalOnly: Story = {
  args: {
    backupLabel: "백업 대기 중",
    folderAlias: "~/Desktop/작업메모",
    metrics: [
      {
        count: 12,
        id: "local",
        label: "기기 안 색인",
        status: "LOCAL_ONLY",
      },
      {
        count: 0,
        id: "pending",
        label: "서버 반영 대기",
        status: "SYNC_PENDING",
      },
      {
        count: 0,
        id: "synced",
        label: "개인 자료함 반영",
        status: "SYNCED",
      },
      {
        count: 0,
        id: "conflict",
        label: "확인 필요",
        status: "CONFLICT",
      },
    ],
    quotaLabel: "개인 자료함 210MB / 1GB",
    quotaPercent: 21,
    syncEnabled: false,
  },
};
