import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { LocalBackupRecoveryPanel } from "./local-backup-recovery-panel";

const meta = {
  component: LocalBackupRecoveryPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Settings/LocalBackupRecoveryPanel",
} satisfies Meta<typeof LocalBackupRecoveryPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
