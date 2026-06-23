import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ManagedFolderIndexPanel } from "./managed-folder-index-panel";

const meta = {
  component: ManagedFolderIndexPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/ManagedFolder/ManagedFolderIndexPanel",
} satisfies Meta<typeof ManagedFolderIndexPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
