import { useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ThemeProvider } from "@/components/theme";
import { WidgetPreview } from "@/components/widget/widget-preview";

const meta = {
  tags: ["uikit", "widget"],
  component: WidgetPreview,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "데스크탑 위에 위젯이 떠 있는 모습을 시뮬레이션. 4상태(Default/Translucent/Ghost/Minimal), 알림 버블 분리, 최소화 바, 도크 orb를 보여준다. 실제 Tauri IPC·click-through는 구현하지 않는다.",
      },
    },
  },
  title: "Widget/WidgetPreview",
} satisfies Meta<typeof WidgetPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

const frame = { padding: 24, maxWidth: 760 } as const;

export const Default: Story = {
  render: () => (
    <div style={frame}>
      <WidgetPreview mode="default" />
    </div>
  ),
};

export const Translucent: Story = {
  render: () => (
    <div style={frame}>
      <WidgetPreview mode="translucent" />
    </div>
  ),
};

export const Ghost: Story = {
  parameters: { docs: { description: { story: "고스트 모드: 거의 투명, 핵심 신호만." } } },
  render: () => (
    <div style={frame}>
      <WidgetPreview mode="ghost" />
    </div>
  ),
};

export const Minimal: Story = {
  parameters: { docs: { description: { story: "최소화: 상단 바 + 할 일/일정 카운트 + 도크 orb." } } },
  render: () => (
    <div style={frame}>
      <WidgetPreview minimized mode="minimal" />
    </div>
  ),
};

export const Notification: Story = {
  parameters: { docs: { description: { story: "알림은 위젯 위로 분리되어 떠오른다." } } },
  render: () => (
    <div style={frame}>
      <WidgetPreview mode="default" notification={{ id: "n1", tone: "agent", text: "에이전트가 하루 정리를 마쳤어요" }} />
    </div>
  ),
};

function DarkPreview({ children }: { children: ReactNode }) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  return (
    <div ref={setEl} style={frame}>
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
      <WidgetPreview mode="default" notification={{ id: "n2", tone: "comment", text: "A사 룸에 새 댓글 2개" }} />
    </DarkPreview>
  ),
};
