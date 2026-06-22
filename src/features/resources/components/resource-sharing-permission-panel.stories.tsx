import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ResourceSharingPermissionPanel } from "./resource-sharing-permission-panel";

const meta = {
  component: ResourceSharingPermissionPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Resources/ResourceSharingPermissionPanel",
} satisfies Meta<typeof ResourceSharingPermissionPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
