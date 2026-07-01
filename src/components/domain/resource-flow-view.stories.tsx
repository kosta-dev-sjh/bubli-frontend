import { useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { RESOURCE_FLOW_SAMPLE, ResourceFlowView } from "@/components/domain/resource-flow-view";
import { ThemeProvider } from "@/components/theme";

const meta = {
  tags: ["uikit", "domain"],
  component: ResourceFlowView,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "자료 → 에이전트 후보 → 승인·근거 → 오늘 할 일 흐름을 새 UI Kit으로 조립. 스토리 전용 샘플 데이터를 주입한다.",
      },
    },
  },
  title: "Domain/ResourceFlowView",
} satisfies Meta<typeof ResourceFlowView>;

export default meta;
type Story = StoryObj<typeof meta>;

const frame = { padding: 24, maxWidth: 1180 } as const;

export const Default: Story = {
  render: () => (
    <div style={frame}>
      <ResourceFlowView data={RESOURCE_FLOW_SAMPLE} />
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <div style={frame}>
      <ResourceFlowView loading />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div style={{ ...frame, maxWidth: 520 }}>
      <ResourceFlowView empty />
    </div>
  ),
};

export const Error: Story = {
  render: () => (
    <div style={{ ...frame, maxWidth: 520 }}>
      <ResourceFlowView error />
    </div>
  ),
};

function DarkPreview({ children }: { children: ReactNode }) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  return (
    <div ref={setEl} style={{ ...frame, background: "#161E2E", borderRadius: 24 }}>
      {el ? (
        <ThemeProvider attributeTarget={el} defaultTheme="dark" enableStorage={false}>
          {children}
        </ThemeProvider>
      ) : null}
    </div>
  );
}

export const Dark: Story = {
  parameters: { backgrounds: { default: "dark" } },
  render: () => (
    <DarkPreview>
      <ResourceFlowView data={RESOURCE_FLOW_SAMPLE} />
    </DarkPreview>
  ),
};
