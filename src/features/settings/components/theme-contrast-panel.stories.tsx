import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ThemeContrastPanel } from "./theme-contrast-panel";

const meta = {
  title: "Features/Settings/ThemeContrastPanel",
  component: ThemeContrastPanel,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof ThemeContrastPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
