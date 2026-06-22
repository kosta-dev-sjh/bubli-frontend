import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  defaultBackgroundChecks,
  defaultTransparencyOptions,
  WidgetTransparencyModePanel,
} from "./widget-transparency-mode-panel";

const meta = {
  component: WidgetTransparencyModePanel,
  parameters: {
    docs: {
      description: {
        component:
          "v14의 widget_preferences.opacity, ghost_mode와 v20 디자인보드의 기본, 반투명, 고스트 위젯 표시 단계를 검토하는 패널입니다.",
      },
    },
  },
  title: "Widget/WidgetTransparencyModePanel",
} satisfies Meta<typeof WidgetTransparencyModePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NormalMode: Story = {
  args: {
    activeMode: "normal",
    backgroundChecks: defaultBackgroundChecks,
    options: defaultTransparencyOptions,
  },
};

export const TranslucentMode: Story = {
  args: {
    activeMode: "translucent",
    backgroundChecks: defaultBackgroundChecks,
    options: defaultTransparencyOptions,
    title: "반투명 위젯 단계",
  },
};

export const GhostMode: Story = {
  args: {
    activeMode: "ghost",
    backgroundChecks: [
      ...defaultBackgroundChecks.slice(0, 2),
      { background: "busy", label: "창이 겹친 화면", result: "pass" },
    ],
    options: defaultTransparencyOptions,
    title: "고스트 위젯 단계",
  },
};
