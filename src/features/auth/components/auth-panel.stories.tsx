import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AuthPanel } from "./auth-panel";

const meta = {
  component: AuthPanel,
  parameters: {
    layout: "fullscreen",
  },
  title: "Features/Auth/AuthPanel",
} satisfies Meta<typeof AuthPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Login: Story = {
  args: {},
};
