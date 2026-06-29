import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ResourceUploadAnalysisPanel } from "./resource-upload-analysis-panel";

const meta = {
  component: ResourceUploadAnalysisPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Resources/ResourceUploadAnalysisPanel",
} satisfies Meta<typeof ResourceUploadAnalysisPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
