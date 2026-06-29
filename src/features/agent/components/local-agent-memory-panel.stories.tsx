import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { LocalAgentMemoryPanel } from "./local-agent-memory-panel";

const meta = {
  component: LocalAgentMemoryPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Agent/LocalAgentMemoryPanel",
} satisfies Meta<typeof LocalAgentMemoryPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
