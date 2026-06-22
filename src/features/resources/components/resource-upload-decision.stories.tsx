import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ResourceUploadDecision } from "./resource-upload-decision";

const meta = {
  component: ResourceUploadDecision,
  parameters: {
    layout: "padded",
  },
  title: "Features/Resources/ResourceUploadDecision",
} satisfies Meta<typeof ResourceUploadDecision>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
