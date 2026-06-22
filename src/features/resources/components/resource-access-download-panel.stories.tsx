import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ResourceAccessDownloadPanel } from "./resource-access-download-panel";

const meta = {
  title: "Features/Resources/ResourceAccessDownloadPanel",
  component: ResourceAccessDownloadPanel,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof ResourceAccessDownloadPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
