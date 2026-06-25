import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  TimerRecoveryBoundaryPanel,
  defaultSyncItems,
  defaultTimerRecoveryState,
  defaultTimerRules,
} from "./timer-recovery-boundary-panel";

const meta = {
  component: TimerRecoveryBoundaryPanel,
  parameters: {
    docs: {
      description: {
        component:
          "타이머의 서버 원본 time_logs와 Tauri SQLite의 복구 상태, 미전송 작업 대기열을 구분해 보여주는 패널입니다.",
      },
    },
  },
  title: "Features/Timer/TimerRecoveryBoundaryPanel",
} satisfies Meta<typeof TimerRecoveryBoundaryPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Running: Story = {
  args: {
    recoveryPercent: 82,
    recoveryState: defaultTimerRecoveryState,
    rules: defaultTimerRules,
    syncItems: defaultSyncItems,
  },
};

export const RecoveryNeeded: Story = {
  args: {
    recoveryPercent: 58,
    recoveryState: {
      heartbeatLabel: "마지막 heartbeat 2분 전",
      localStateLabel: "local_timer_state와 서버 기록 비교 필요",
      serverTimeLabel: "time_logs 01:18:42",
      status: "RECOVERY_NEEDED",
      taskTitle: "최종 납품 자료 확인",
    },
    rules: defaultTimerRules,
    syncItems: defaultSyncItems.map((item) => ({
      ...item,
      status: item.label === "time_logs" ? "SENT" : "RETRYING",
    })),
    title: "비정상 종료 후 복구",
  },
};

export const PausedWithOutbox: Story = {
  args: {
    recoveryPercent: 70,
    recoveryState: {
      heartbeatLabel: "일시정지 상태",
      localStateLabel: "재연결 후 대기열 전송",
      serverTimeLabel: "time_logs 00:46:10",
      status: "PAUSED",
      taskTitle: "회의록 확인 질문 정리",
    },
    rules: defaultTimerRules,
    syncItems: defaultSyncItems.map((item) => ({
      ...item,
      status: item.label === "local_sync_outbox" ? "WAITING" : "SENT",
    })),
  },
};
