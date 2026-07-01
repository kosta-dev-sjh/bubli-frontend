import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { TimerRecoveryPanel } from "./timer-recovery-panel";

const meta = {
  component: TimerRecoveryPanel,
  parameters: {
    docs: {
      description: {
        component:
          "Tauri 타이머 위젯의 복구 상태 패널입니다. 서버 작업 시간 기록을 기준으로 두고 기기 안 복구 상태와 전송 대기열로 비정상 종료와 네트워크 끊김을 복구하는 기획 기준을 반영합니다.",
      },
    },
  },
  title: "Features/Timer/TimerRecoveryPanel",
} satisfies Meta<typeof TimerRecoveryPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Running: Story = {
  args: {
    heartbeatAgeSeconds: 42,
    heartbeatIntervalSeconds: 60,
    modeLabel: "작업 타이머",
    projectLabel: "Bubli 제품 개발",
    recoveryThresholdSeconds: 90,
    serverStatusLabel: "마지막 heartbeat 42초 전",
    status: "RUNNING",
    taskLabel: "자료보드 검수",
    timeLabel: "42:18",
    unsentEventCount: 2,
  },
};

export const RecoveryNeeded: Story = {
  args: {
    heartbeatAgeSeconds: 124,
    heartbeatIntervalSeconds: 60,
    modeLabel: "25분 집중",
    projectLabel: "번역 자료 검토",
    recoveryThresholdSeconds: 90,
    serverStatusLabel: "마지막 heartbeat 2분 전",
    status: "RECOVERY_NEEDED",
    taskLabel: "1차 번역 검수",
    timeLabel: "24:56",
    unsentEventCount: 5,
  },
};

export const Recovered: Story = {
  args: {
    heartbeatAgeSeconds: 0,
    heartbeatIntervalSeconds: 60,
    modeLabel: "작업 타이머",
    projectLabel: "신규 홈페이지 리뉴얼",
    recoveryThresholdSeconds: 90,
    serverStatusLabel: "방금 복구됨",
    status: "RECOVERED",
    taskLabel: "WBS 후보 정리",
    timeLabel: "01:12:08",
    unsentEventCount: 0,
  },
};
