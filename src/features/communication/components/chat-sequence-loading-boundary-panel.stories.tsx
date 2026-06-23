import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ChatSequenceLoadingBoundaryPanel } from "./chat-sequence-loading-boundary-panel";

const meta = {
  component: ChatSequenceLoadingBoundaryPanel,
  parameters: {
    layout: "fullscreen",
  },
  title: "Features/Communication/Chat Sequence Loading Boundary Panel",
} satisfies Meta<typeof ChatSequenceLoadingBoundaryPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <main className="shell">
      <ChatSequenceLoadingBoundaryPanel />
    </main>
  ),
};
