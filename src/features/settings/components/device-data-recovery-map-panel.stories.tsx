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
          "v15의 서버 기록, 기기 안 캐시, 기기 안 백업 전략을 바탕으로 데이터별 복구 출처를 보여주는 설정 패널입니다.",
      },
    },
  },
  title: "Features/Settings/DeviceDataRecoveryMapPanel",
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
      snapshot.labelKey === "settings.dr.snap.queue.label" ? { ...snapshot, tone: "success" as const } : snapshot,
    ),
    items: defaultRecoveryItems.map((item) =>
      item.source === "NOT_RECOVERABLE" ? { ...item, health: "ATTENTION" } : item,
    ),
    title: "복구 준비 상태",
  },
};

export const NoLocalBackup: Story = {
  args: {
    backupSnapshots: defaultBackupSnapshots.map((snapshot) =>
      snapshot.labelKey === "settings.dr.snap.queue.label"
        ? { ...snapshot, tone: "pending" as const }
        : { ...snapshot, tone: "warning" as const },
    ),
    items: defaultRecoveryItems.map((item) =>
      item.source === "LOCAL_BACKUP" ? { ...item, health: "RISK", lastCheckedLabel: "백업 없음" } : item,
    ),
    title: "로컬 백업 없음",
  },
};
