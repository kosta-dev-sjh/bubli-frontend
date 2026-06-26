import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { WorkspaceTopbar, type WorkspaceTopbarProps } from "./workspace-topbar";

const defaultArgs: WorkspaceTopbarProps = {
  notificationCount: 3,
  project: {
    description: "번역 계약서 검토와 WBS 정리 중",
    name: "브랜드 상세페이지 번역",
    statusLabel: "프로젝트룸",
  },
  user: {
    displayName: "정현 님",
    email: "junghyun@bubli.kr",
    initials: "JH",
  },
};

const meta = {
  args: defaultArgs,
  component: WorkspaceTopbar,
  parameters: {
    layout: "fullscreen",
  },
  render: (args) => (
    <main className="shell">
      <WorkspaceTopbar {...args} />
      <section className="page-grid">
        <div className="bubli-card p-5">
          <h2 className="m-0 text-[22px] font-[860] text-[var(--color-text)]">대시보드 영역</h2>
          <p className="m-0 mt-2 text-[14px] text-[var(--color-muted)]">
            상단 바는 프로젝트룸 선택, 검색, 알림, 프로필 진입만 담당합니다.
          </p>
        </div>
      </section>
    </main>
  ),
  title: "Layout/WorkspaceTopbar",
} satisfies Meta<typeof WorkspaceTopbar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MemberWebApp: Story = {};

export const TauriCommunicationSurface: Story = {
  args: {
    notificationCount: 12,
    searchPlaceholder: "채팅, 보이스, 친구 검색",
    surfaceLabel: "데스크탑 소통 창",
  },
};
