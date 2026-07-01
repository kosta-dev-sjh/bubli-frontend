import type { CSSProperties, ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";

const meta = {
  tags: ["uikit", "primitive"],
  component: GlassPanel,
  parameters: {
    docs: {
      description: {
        component:
          "Bubli의 공통 표면(Paper Glass). 면은 거의 흰색, 색은 면이 아니라 rim·dot·tiny glow·focus ring에만. 넓고 옅은 ambient shadow + 절제된 backdrop blur. GlassPanel·glass-panel·bubli-card는 같은 surface 토큰으로 수렴됩니다.",
      },
    },
  },
  title: "UI/GlassPanel",
} satisfies Meta<typeof GlassPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

const wrap: CSSProperties = { display: "grid", gap: 16, maxWidth: 420 };

function Sample({ title = "오늘 할 일" }: { title?: string }) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <strong style={{ fontSize: 14 }}>{title}</strong>
        <StatusBadge tone="todo">3</StatusBadge>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.6 }}>
        기준 자료·요구사항·회의록을 모으면 에이전트가 오늘 할 일로 정리해드려요.
      </p>
    </>
  );
}

export const Default: Story = {
  render: () => (
    <div style={wrap}>
      <GlassPanel>
        <Sample />
      </GlassPanel>
    </div>
  ),
};

// hover 가능 카드만 아주 약한 lift
export const Hover: Story = {
  render: () => (
    <div style={wrap}>
      <GlassPanel className="is-hover" interactive>
        <Sample />
      </GlassPanel>
    </div>
  ),
};

export const Focus: Story = {
  render: () => (
    <div style={wrap}>
      <GlassPanel className="is-focus" interactive tabIndex={0}>
        <Sample />
      </GlassPanel>
    </div>
  ),
};

// 조용한 skeleton shimmer
export const Loading: Story = {
  render: () => (
    <div style={wrap}>
      <GlassPanel loading />
    </div>
  ),
};

// Bubble Empty State 톤
export const Empty: Story = {
  render: () => (
    <div style={wrap}>
      <GlassPanel className="bubli-surface--empty">
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700 }}>아직 자료가 없어요</p>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)" }}>
            받은 자료를 올리면, 오늘 할 일로 정리해드려요.
          </p>
        </div>
      </GlassPanel>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div style={wrap}>
      <GlassPanel disabled>
        <Sample />
      </GlassPanel>
    </div>
  ),
};

// Dense: 정보 많은 화면(자료보드/WBS)
export const Dense: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 10, maxWidth: 420 }}>
      <GlassPanel dense>
        <Sample title="기준 자료_최종.pdf" />
      </GlassPanel>
      <GlassPanel dense>
        <Sample title="요구사항_정리.docx" />
      </GlassPanel>
    </div>
  ),
};

// Floating: 바탕화면 위 떠 있는 위젯 카드
export const Floating: Story = {
  render: () => (
    <div
      style={{
        background:
          "radial-gradient(60% 50% at 20% 10%, rgba(158,216,255,.28), transparent 60%), linear-gradient(160deg,#EAF2FB,#E0EAF6)",
        borderRadius: 22,
        padding: 36,
        maxWidth: 460,
      }}
    >
      <GlassPanel floating>
        <Sample />
      </GlassPanel>
    </div>
  ),
};

function DarkFrame({ children }: { children: ReactNode }) {
  return (
    <div data-theme="dark" style={{ background: "#161E2E", borderRadius: 22, padding: 28, maxWidth: 460 }}>
      {children}
    </div>
  );
}

export const Dark: Story = {
  parameters: { backgrounds: { default: "dark" } },
  render: () => (
    <DarkFrame>
      <div style={{ display: "grid", gap: 12 }}>
        <GlassPanel>
          <Sample />
        </GlassPanel>
        <GlassPanel loading />
      </div>
    </DarkFrame>
  ),
};
