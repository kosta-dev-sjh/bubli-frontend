import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  defaultDensityOptions,
  defaultDensityPreviewItems,
  defaultDensitySurfaceRules,
  WidgetDensityModePanel,
} from "./widget-density-mode-panel";

const meta = {
  component: WidgetDensityModePanel,
  parameters: {
    docs: {
      description: {
        component:
          "v15의 user_preferences.density와 v20 디자인보드의 기본, 집중, 컴팩트 위젯 표시 밀도를 검토하는 패널입니다.",
      },
    },
  },
  title: "Features/Widget/WidgetDensityModePanel",
} satisfies Meta<typeof WidgetDensityModePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DefaultDensity: Story = {
  args: {
    activeMode: "default",
    options: defaultDensityOptions,
    previewItems: defaultDensityPreviewItems,
    surfaceRules: defaultDensitySurfaceRules,
  },
};

export const FocusDensity: Story = {
  args: {
    activeMode: "focus",
    options: defaultDensityOptions,
    previewItems: defaultDensityPreviewItems,
    surfaceRules: defaultDensitySurfaceRules,
    title: "집중 표시 모드",
  },
};

export const CompactDensity: Story = {
  args: {
    activeMode: "compact",
    options: defaultDensityOptions,
    previewItems: [
      ...defaultDensityPreviewItems,
      { label: "widget.density.item.chat", source: "server", value: "widget.density.item.chatValue" },
      { label: "widget.kind.notification", source: "cache", value: "widget.density.item.timerValue" },
    ],
    surfaceRules: defaultDensitySurfaceRules,
    title: "컴팩트 표시 모드",
  },
};
