import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  defaultMotionRules,
  defaultMotionScenarios,
  WidgetMotionPolicyPanel,
} from "./widget-motion-policy-panel";

const meta = {
  component: WidgetMotionPolicyPanel,
  parameters: {
    docs: {
      description: {
        component:
          "v14의 위젯 접근성/성능 기준과 디자인보드 v20의 모션 제한을 바탕으로, 버블 위젯의 정적 기본값과 짧은 반응만 검토하는 패널입니다.",
      },
    },
  },
  title: "Features/Widget/WidgetMotionPolicyPanel",
} satisfies Meta<typeof WidgetMotionPolicyPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const StaticDefault: Story = {
  args: {
    activeMode: "static",
    rules: defaultMotionRules,
    scenarios: defaultMotionScenarios,
  },
};

export const HoverFeedback: Story = {
  args: {
    activeMode: "hover",
    rules: defaultMotionRules,
    scenarios: defaultMotionScenarios,
    title: "호버 중심 버블 반응",
  },
};

export const NotificationSignal: Story = {
  args: {
    activeMode: "signal",
    rules: defaultMotionRules,
    scenarios: defaultMotionScenarios,
    title: "상태 신호 모션",
  },
};

export const ReducedMotion: Story = {
  args: {
    activeMode: "reduced",
    rules: defaultMotionRules,
    scenarios: defaultMotionScenarios,
    title: "모션 줄이기 상태",
  },
};
