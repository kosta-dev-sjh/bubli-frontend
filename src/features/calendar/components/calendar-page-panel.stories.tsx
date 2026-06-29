import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CalendarPagePanel } from "./calendar-page-panel";

const meta = {
  component: CalendarPagePanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Calendar/CalendarPagePanel",
} satisfies Meta<typeof CalendarPagePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Ready: Story = {
  args: {
    state: "ready",
  },
};

export const Empty: Story = {
  args: {
    state: "empty",
  },
};

export const Loading: Story = {
  args: {
    state: "loading",
  },
};

export const Error: Story = {
  args: {
    state: "error",
  },
};
