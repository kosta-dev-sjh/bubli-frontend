import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { NotificationPreferencesPanel } from "./notification-preferences-panel";

const meta = {
  title: "Features/Settings/NotificationPreferencesPanel",
  component: NotificationPreferencesPanel,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof NotificationPreferencesPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
