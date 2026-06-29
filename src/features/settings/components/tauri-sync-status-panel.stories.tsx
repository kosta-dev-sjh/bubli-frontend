import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { TauriSyncStatusPanel } from "./tauri-sync-status-panel";

const meta = {
  component: TauriSyncStatusPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Settings/TauriSyncStatusPanel",
} satisfies Meta<typeof TauriSyncStatusPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
