import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { LocalSyncOutboxPanel } from "./local-sync-outbox-panel";

const meta = {
  component: LocalSyncOutboxPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Settings/LocalSyncOutboxPanel",
} satisfies Meta<typeof LocalSyncOutboxPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    autoLoad: false,
    initialConsentGranted: true,
    initialSummary: {
      failedCount: 1,
      pendingCount: 2,
      sentCount: 4,
      serverTransfer: "not_started",
      summarizedAt: "2026-07-04T00:00:00.000Z",
    },
  },
};
