import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AgentDraftSuggestionPanel } from "./agent-draft-suggestion-panel";

const meta = {
  component: AgentDraftSuggestionPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Agent/AgentDraftSuggestionPanel",
} satisfies Meta<typeof AgentDraftSuggestionPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
