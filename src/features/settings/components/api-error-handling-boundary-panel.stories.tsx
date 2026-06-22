import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ApiErrorHandlingBoundaryPanel } from "./api-error-handling-boundary-panel";

const meta = {
  component: ApiErrorHandlingBoundaryPanel,
  parameters: {
    layout: "fullscreen",
  },
  title: "Features/Settings/API Error Handling Boundary Panel",
} satisfies Meta<typeof ApiErrorHandlingBoundaryPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <main className="shell">
      <ApiErrorHandlingBoundaryPanel />
    </main>
  ),
};
