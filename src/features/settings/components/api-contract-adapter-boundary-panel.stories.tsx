import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ApiContractAdapterBoundaryPanel } from "./api-contract-adapter-boundary-panel";

const meta = {
  component: ApiContractAdapterBoundaryPanel,
  parameters: {
    layout: "fullscreen",
  },
  title: "Features/Settings/API Contract Adapter Boundary Panel",
} satisfies Meta<typeof ApiContractAdapterBoundaryPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <main className="shell">
      <ApiContractAdapterBoundaryPanel />
    </main>
  ),
};
