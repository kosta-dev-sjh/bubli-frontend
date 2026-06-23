import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AuthRefreshRotationBoundaryPanel } from "./auth-refresh-rotation-boundary-panel";

const meta = {
  component: AuthRefreshRotationBoundaryPanel,
  parameters: {
    layout: "fullscreen",
  },
  title: "Features/Auth/Auth Refresh Rotation Boundary Panel",
} satisfies Meta<typeof AuthRefreshRotationBoundaryPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <main className="shell">
      <AuthRefreshRotationBoundaryPanel />
    </main>
  ),
};
