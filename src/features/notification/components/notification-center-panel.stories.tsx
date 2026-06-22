import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { NotificationCenterPanel } from "./notification-center-panel";

const meta = {
  component: NotificationCenterPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Notification/NotificationCenterPanel",
} satisfies Meta<typeof NotificationCenterPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
