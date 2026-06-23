import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { FriendInvitePanel } from "./friend-invite-panel";

const meta = {
  component: FriendInvitePanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Communication/FriendInvitePanel",
} satisfies Meta<typeof FriendInvitePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
