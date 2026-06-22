import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { NotificationRoutingBoundaryPanel } from "./notification-routing-boundary-panel";

const meta = {
  component: NotificationRoutingBoundaryPanel,
  parameters: {
    layout: "fullscreen",
  },
  title: "Features/Notification/Notification Routing Boundary Panel",
} satisfies Meta<typeof NotificationRoutingBoundaryPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <main className="shell">
      <NotificationRoutingBoundaryPanel />
    </main>
  ),
};
