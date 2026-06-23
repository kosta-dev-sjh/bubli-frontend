import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { GuestCommunicationAccessPanel } from "./guest-communication-access-panel";

const meta = {
  component: GuestCommunicationAccessPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Communication/GuestCommunicationAccessPanel",
} satisfies Meta<typeof GuestCommunicationAccessPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
