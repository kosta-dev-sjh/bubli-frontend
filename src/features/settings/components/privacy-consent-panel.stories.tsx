import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PrivacyConsentPanel } from "./privacy-consent-panel";

const meta = {
  title: "Features/Settings/PrivacyConsentPanel",
  component: PrivacyConsentPanel,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof PrivacyConsentPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
