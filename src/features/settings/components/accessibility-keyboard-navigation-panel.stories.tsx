import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  AccessibilityKeyboardNavigationPanel,
  defaultKeyboardRules,
  defaultKeyboardTargets,
} from "./accessibility-keyboard-navigation-panel";

const meta = {
  component: AccessibilityKeyboardNavigationPanel,
  parameters: {
    docs: {
      description: {
        component:
          "v14 NFR-16과 디자인보드 v20의 focus-visible 흐름을 기준으로, 자료 업로드, 후보 승인, 위젯 기본 조작을 키보드로 점검하는 패널입니다.",
      },
    },
  },
  title: "Settings/AccessibilityKeyboardNavigationPanel",
} satisfies Meta<typeof AccessibilityKeyboardNavigationPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const BubbleControls: Story = {
  args: {
    activeTarget: "bubble",
    rules: defaultKeyboardRules,
    targets: defaultKeyboardTargets,
  },
};

export const ApprovalButtons: Story = {
  args: {
    activeTarget: "button",
    rules: defaultKeyboardRules,
    targets: defaultKeyboardTargets,
    title: "승인 버튼 접근성 점검",
  },
};

export const DialogEscape: Story = {
  args: {
    activeTarget: "dialog",
    rules: defaultKeyboardRules,
    targets: defaultKeyboardTargets,
    title: "확인 창 탈출 경로",
  },
};

export const BoardFallback: Story = {
  args: {
    activeTarget: "board",
    rules: defaultKeyboardRules,
    targets: defaultKeyboardTargets,
    title: "보드 항목 키보드 대체 흐름",
  },
};
