import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  defaultBackupSnapshots,
  defaultRecoveryItems,
  DeviceDataRecoveryMapPanel,
} from "./device-data-recovery-map-panel";

const meta = {
  component: DeviceDataRecoveryMapPanel,
  parameters: {
    docs: {
      description: {
        component:
          "v14의 서버 DB 원본, 기기 안 캐시, 로컬 백업 전략을 바탕으로 데이터별 복구 출처를 보여주는 설정 패널입니다.",
      },
    },
  },
  title: "Settings/DeviceDataRecoveryMapPanel",
} satisfies Meta<typeof DeviceDataRecoveryMapPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    backupSnapshots: defaultBackupSnapshots,
    items: defaultRecoveryItems,
  },
};

export const HealthyDevice: Story = {
  args: {
    backupSnapshots: defaultBackupSnapshots.map((snapshot) =>
      snapshot.label === "대기열" ? { ...snapshot, tone: "success", value: "0건" } : snapshot,
    ),
    items: defaultRecoveryItems.map((item) =>
      item.source === "NOT_RECOVERABLE" ? { ...item, health: "ATTENTION" } : item,
    ),
    title: "복구 준비 상태",
  },
};

export const NoLocalBackup: Story = {
  args: {
    backupSnapshots: [
      { label: "최근 백업", tone: "warning", value: "없음" },
      { label: "보관 파일", tone: "warning", value: "0개" },
      { label: "대기열", tone: "pending", value: "3건" },
      { label: "무결성", tone: "warning", value: "확인 필요" },
    ],
    items: defaultRecoveryItems.map((item) =>
      item.source === "LOCAL_BACKUP" ? { ...item, health: "RISK", lastCheckedLabel: "백업 없음" } : item,
    ),
    title: "로컬 백업 없음",
  },
};
