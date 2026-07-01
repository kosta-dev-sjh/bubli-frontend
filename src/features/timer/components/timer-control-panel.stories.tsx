import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { TimerControlPanel, type TimerControlState } from "./timer-control-panel";

const meta = {
  component: TimerControlPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Timer/TimerControlPanel",
} satisfies Meta<typeof TimerControlPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

const pausedState: TimerControlState = {
  elapsedLabel: "13:28",
  heartbeatLabel: "일시정지됨",
  id: "timer-paused",
  projectRoomLabel: "서비스 소개 페이지",
  status: "PAUSED",
  taskLabel: "자료보드 문구 점검",
  todayTotalLabel: "02:11",
  unsentEventCount: 0,
};

const recoveryState: TimerControlState = {
  elapsedLabel: "42:18",
  heartbeatLabel: "마지막 신호 2분 전",
  id: "timer-recovery",
  projectRoomLabel: "웹사이트 리뉴얼",
  status: "RECOVERY_NEEDED",
  taskLabel: "1차 시안 검토",
  todayTotalLabel: "03:42",
  unsentEventCount: 4,
};

export const Running: Story = {};

export const Paused: Story = {
  args: {
    state: pausedState,
  },
};

export const RecoveryNeeded: Story = {
  args: {
    state: recoveryState,
  },
};
