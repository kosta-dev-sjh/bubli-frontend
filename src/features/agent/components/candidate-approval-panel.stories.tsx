import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CandidateApprovalPanel } from "./candidate-approval-panel";

const meta = {
  component: CandidateApprovalPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Agent/CandidateApprovalPanel",
} satisfies Meta<typeof CandidateApprovalPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
