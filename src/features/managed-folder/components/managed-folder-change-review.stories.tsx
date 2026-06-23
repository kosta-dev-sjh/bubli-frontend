import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ManagedFolderChangeReview } from "./managed-folder-change-review";

const meta = {
  component: ManagedFolderChangeReview,
  parameters: {
    layout: "padded",
  },
  title: "Features/ManagedFolder/ManagedFolderChangeReview",
} satisfies Meta<typeof ManagedFolderChangeReview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
