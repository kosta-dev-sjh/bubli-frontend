import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { WbsFourViewTogglePanel } from "./wbs-four-view-toggle-panel";

const meta = {
  component: WbsFourViewTogglePanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Wbs/WbsFourViewTogglePanel",
} satisfies Meta<typeof WbsFourViewTogglePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Tree: Story = {};

export const Kanban: Story = {
  args: { initialView: "kanban" },
};

export const Timeline: Story = {
  args: { initialView: "timeline" },
};

export const Gantt: Story = {
  args: { initialView: "gantt" },
};

export const Empty: Story = {
  args: { state: "empty" },
};

export const Loading: Story = {
  args: { state: "loading" },
};

export const Error: Story = {
  args: { state: "error" },
};
