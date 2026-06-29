import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { StorageSyncPolicyPanel } from "./storage-sync-policy-panel";

const meta = {
  title: "Features/Managed Folder/StorageSyncPolicyPanel",
  component: StorageSyncPolicyPanel,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof StorageSyncPolicyPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
