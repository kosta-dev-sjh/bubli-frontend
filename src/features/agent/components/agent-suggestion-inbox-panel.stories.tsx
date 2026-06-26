import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AgentSuggestionInboxPanel } from "./agent-suggestion-inbox-panel";

const meta = {
  component: AgentSuggestionInboxPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Agent/AgentSuggestionInboxPanel",
} satisfies Meta<typeof AgentSuggestionInboxPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Ready: Story = {
  args: {
    state: "ready",
  },
};

export const Empty: Story = {
  args: {
    items: [],
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
