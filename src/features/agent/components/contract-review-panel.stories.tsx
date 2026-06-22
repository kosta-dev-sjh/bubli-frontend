import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ContractReviewPanel } from "./contract-review-panel";

const meta = {
  component: ContractReviewPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Agent/ContractReviewPanel",
} satisfies Meta<typeof ContractReviewPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
