import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { MemberRolePanel } from "./member-role-panel";

const meta = {
  component: MemberRolePanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/ProjectRoom/MemberRolePanel",
} satisfies Meta<typeof MemberRolePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
