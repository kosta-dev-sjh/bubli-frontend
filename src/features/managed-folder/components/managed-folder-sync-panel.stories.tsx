import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ManagedFolderSyncPanel } from "./managed-folder-sync-panel";

const meta = {
  component: ManagedFolderSyncPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/ManagedFolder/ManagedFolderSyncPanel",
} satisfies Meta<typeof ManagedFolderSyncPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
