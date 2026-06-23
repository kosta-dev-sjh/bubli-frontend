import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { defaultReadabilityScenarios, WidgetBackgroundReadabilityPanel } from "./widget-background-readability-panel";

const meta = {
  component: WidgetBackgroundReadabilityPanel,
  parameters: {
    docs: {
      description: {
        component:
          "Tauri 위젯이 밝은 배경, 어두운 배경, 복잡한 배경에서도 업무 내용이 먼저 읽히는지 확인하는 패널입니다.",
      },
    },
  },
  title: "Widget/WidgetBackgroundReadabilityPanel",
} satisfies Meta<typeof WidgetBackgroundReadabilityPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DefaultReadability: Story = {
  args: {
    scenarios: defaultReadabilityScenarios,
  },
};

export const NeedsAdjustment: Story = {
  args: {
    scenarios: [
      ...defaultReadabilityScenarios.slice(0, 2),
      {
        background: "busy",
        caption: "복잡한 배경에서 글자 크기와 불투명도를 더 올려야 하는 상태",
        fontScale: 90,
        ghostMode: true,
        result: "fail",
        textMode: "auto",
        title: "복잡한 배경 조정 필요",
      },
    ],
    title: "가독성 조정 필요 상태",
  },
};

export const LargeTextMode: Story = {
  args: {
    scenarios: defaultReadabilityScenarios.map((scenario) => ({
      ...scenario,
      fontScale: 130,
      result: "pass",
    })),
    title: "큰 글자 모드",
  },
};
