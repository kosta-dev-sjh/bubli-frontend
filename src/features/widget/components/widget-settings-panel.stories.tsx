import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { WidgetSettingsPanel } from "./widget-settings-panel";

const meta = {
  args: {
    autoLoad: false,
    initialBubbles: [
      {
        alertEnabled: true,
        bubbleType: "TODO",
        enabled: true,
        ghostMode: false,
        height: 310,
        id: "story-todo",
        minimized: false,
        opacity: 0.95,
        width: 320,
        x: 80,
        y: 120,
      },
      {
        alertEnabled: true,
        bubbleType: "AGENT",
        enabled: true,
        ghostMode: false,
        height: 290,
        id: "story-agent",
        minimized: true,
        opacity: 0.88,
        width: 320,
        x: 420,
        y: 120,
      },
      {
        alertEnabled: false,
        bubbleType: "CHAT",
        enabled: false,
        ghostMode: true,
        height: 300,
        id: "story-chat",
        minimized: false,
        opacity: 0.8,
        width: 340,
        x: 80,
        y: 480,
      },
      {
        alertEnabled: true,
        bubbleType: "TIMER",
        enabled: true,
        ghostMode: false,
        height: 280,
        id: "story-timer",
        minimized: false,
        opacity: 0.92,
        width: 310,
        x: 420,
        y: 480,
      },
    ],
  },
  component: WidgetSettingsPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Widget/WidgetSettingsPanel",
} satisfies Meta<typeof WidgetSettingsPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
