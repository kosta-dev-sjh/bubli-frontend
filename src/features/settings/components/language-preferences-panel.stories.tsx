import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { LanguagePreferencesPanel } from "./language-preferences-panel";

const meta = {
  title: "Features/Settings/LanguagePreferencesPanel",
  component: LanguagePreferencesPanel,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof LanguagePreferencesPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
