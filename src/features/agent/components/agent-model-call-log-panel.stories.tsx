import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AgentModelCallLogPanel } from "./agent-model-call-log-panel";

const meta = {
  component: AgentModelCallLogPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Agent/AgentModelCallLogPanel",
} satisfies Meta<typeof AgentModelCallLogPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
