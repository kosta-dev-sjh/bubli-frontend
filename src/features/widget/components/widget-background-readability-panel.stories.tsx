import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { defaultReadabilityScenarios, WidgetBackgroundReadabilityPanel } from "./widget-background-readability-panel";

const meta = {
  component: WidgetBackgroundReadabilityPanel,
  parameters: {
    docs: {
      description: {
        component:
          "데스크탑 위젯이 밝은 배경, 어두운 배경, 복잡한 배경에서도 업무 내용이 먼저 읽히는지 확인하는 패널입니다.",
      },
    },
  },
  title: "Features/Widget/WidgetBackgroundReadabilityPanel",
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
    scenarios: defaultReadabilityScenarios.map((scenario) =>
      scenario.background === "busy" ? { ...scenario, fontScale: 90, ghostMode: true, result: "fail" as const } : scenario,
    ),
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
