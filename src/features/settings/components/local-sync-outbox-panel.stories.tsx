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

export const Default: Story = {};
