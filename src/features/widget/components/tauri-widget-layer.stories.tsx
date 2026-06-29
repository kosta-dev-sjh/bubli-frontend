import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { TauriWidgetLayer } from "./tauri-widget-layer";

const meta = {
  title: "Features/Widget/TauriWidgetLayer",
  component: TauriWidgetLayer,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof TauriWidgetLayer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
