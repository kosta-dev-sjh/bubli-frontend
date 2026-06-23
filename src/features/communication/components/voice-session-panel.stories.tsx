import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { VoiceSessionPanel } from "./voice-session-panel";

const meta = {
  component: VoiceSessionPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Communication/VoiceSessionPanel",
} satisfies Meta<typeof VoiceSessionPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
