import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DesktopWidgetBubble } from "./desktop-widget-bubble";

const meta = {
  component: DesktopWidgetBubble,
  parameters: {
    layout: "centered",
  },
  title: "Features/Widget/DesktopWidgetBubble",
} satisfies Meta<typeof DesktopWidgetBubble>;

export default meta;

type Story = StoryObj<typeof meta>;

const baseArgs = {
  activeBubble: "todo",
  alwaysOnTop: true,
  clickThrough: false,
  onClose: () => undefined,
  onModeChange: () => undefined,
  onToggleAlwaysOnTop: () => undefined,
  presentation: "preview",
} satisfies Partial<Story["args"]>;

export const Default: Story = {
  args: {
    ...baseArgs,
    mode: "DEFAULT",
  },
};

export const Ghost: Story = {
  args: {
    ...baseArgs,
    clickThrough: true,
    mode: "GHOST",
  },
};

export const Minimized: Story = {
  args: {
    ...baseArgs,
    mode: "MINIMIZED",
  },
};

export const ResourceSuggestion: Story = {
  args: {
    ...baseArgs,
    activeBubble: "resource",
    mode: "TRANSLUCENT",
  },
};

export const CommunicationHandoff: Story = {
  args: {
    ...baseArgs,
    activeBubble: "chat",
    mode: "DEFAULT",
  },
};
