import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AgentJobStatusPanel } from "./agent-job-status-panel";

const meta = {
  component: AgentJobStatusPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Agent/AgentJobStatusPanel",
} satisfies Meta<typeof AgentJobStatusPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
