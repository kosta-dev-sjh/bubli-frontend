import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ProjectReferenceInfo } from "./project-reference-info";

const meta = {
  title: "Features/ProjectRoom/ProjectReferenceInfo",
  component: ProjectReferenceInfo,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof ProjectReferenceInfo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
