import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { GoogleCalendarSyncPanel } from "./google-calendar-sync-panel";

const meta = {
  component: GoogleCalendarSyncPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Calendar/GoogleCalendarSyncPanel",
} satisfies Meta<typeof GoogleCalendarSyncPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
