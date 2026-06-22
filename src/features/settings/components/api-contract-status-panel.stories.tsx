import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ApiContractStatusPanel } from "./api-contract-status-panel";

const meta = {
  component: ApiContractStatusPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Settings/ApiContractStatusPanel",
} satisfies Meta<typeof ApiContractStatusPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
