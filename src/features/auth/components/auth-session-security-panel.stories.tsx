import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AuthSessionSecurityPanel } from "./auth-session-security-panel";

const meta = {
  component: AuthSessionSecurityPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Auth/AuthSessionSecurityPanel",
} satisfies Meta<typeof AuthSessionSecurityPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
