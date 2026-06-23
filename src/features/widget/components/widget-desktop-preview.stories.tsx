import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { WidgetDesktopPreview } from "@/features/widget/components/widget-desktop-preview";

const meta = {
  component: WidgetDesktopPreview,
  parameters: {
    docs: {
      description: {
        component:
          "데스크탑 버블 위젯은 Tauri 앱에서 제공하는 개인 작업 인터페이스입니다. 프로젝트룸 화면을 작게 복제하지 않고, 서버 원본과 Tauri SQLite 캐시/복구 정책을 구분해 표시합니다.",
      },
    },
    layout: "fullscreen",
  },
  title: "Features/Widget/WidgetDesktopPreview",
} satisfies Meta<typeof WidgetDesktopPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <main className="shell" style={{ maxWidth: 1280, margin: "0 auto" }}>
      <WidgetDesktopPreview />
    </main>
  ),
};
