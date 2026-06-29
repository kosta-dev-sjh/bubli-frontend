import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  defaultWidgetPersistenceRules,
  defaultWidgetWindowControls,
  WidgetWindowControlsPanel,
} from "./widget-window-controls-panel";

const meta = {
  component: WidgetWindowControlsPanel,
  parameters: {
    docs: {
      description: {
        component:
          "데스크탑 버블 창의 상단 고정, 고스트 모드, 최소화, 자동 레이아웃 조작과 서버 기록/기기 안 저장 기준을 함께 보여주는 패널입니다.",
      },
    },
  },
  title: "Features/Widget/WidgetWindowControlsPanel",
} satisfies Meta<typeof WidgetWindowControlsPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DefaultWorkspace: Story = {
  args: {
    controls: defaultWidgetWindowControls,
    density: "default",
    persistenceRules: defaultWidgetPersistenceRules,
    textMode: "auto",
    visibleBubbleCount: 4,
  },
};

export const GhostFocusMode: Story = {
  args: {
    controls: defaultWidgetWindowControls.map((control) =>
      control.label === "고스트 모드" ? { ...control, enabled: true } : control,
    ),
    density: "focus",
    persistenceRules: defaultWidgetPersistenceRules,
    textMode: "light",
    title: "고스트 모드 제어",
    visibleBubbleCount: 3,
  },
};

export const CompactDockMode: Story = {
  args: {
    controls: defaultWidgetWindowControls.map((control) =>
      control.label === "자동 레이아웃" ? { ...control, enabled: false } : control,
    ),
    density: "compact",
    persistenceRules: defaultWidgetPersistenceRules,
    textMode: "dark",
    title: "최소화 도크 상태",
    visibleBubbleCount: 2,
  },
};
