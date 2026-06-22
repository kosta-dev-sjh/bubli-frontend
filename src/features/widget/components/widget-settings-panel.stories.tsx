import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { WidgetSettingsPanel } from "./widget-settings-panel";

const meta = {
  component: WidgetSettingsPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Widget/WidgetSettingsPanel",
} satisfies Meta<typeof WidgetSettingsPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
