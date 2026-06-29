import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SettingsLocalPanel } from "./settings-local-panel";

const meta = {
  component: SettingsLocalPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Settings/SettingsLocalPanel",
} satisfies Meta<typeof SettingsLocalPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
