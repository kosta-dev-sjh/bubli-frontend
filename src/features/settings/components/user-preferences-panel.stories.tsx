import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { UserPreferencesPanel } from "./user-preferences-panel";

const meta = {
  title: "Features/Settings/UserPreferencesPanel",
  component: UserPreferencesPanel,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof UserPreferencesPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
