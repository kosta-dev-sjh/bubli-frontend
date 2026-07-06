import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { getWidgetPreviewBubble, type WidgetPreviewBubble } from "@/features/widget/desktop-widget-preview-data";
import type { WidgetWindowState } from "@/lib/tauri/commands";

import { DesktopWidgetBubble, DesktopWidgetBubbleBar } from "./desktop-widget-bubble";

const meta = {
  component: DesktopWidgetBubble,
  parameters: {
    layout: "centered",
  },
  title: "Features/Widget/DesktopWidgetBubble",
} satisfies Meta<typeof DesktopWidgetBubble>;

export default meta;

type Story = StoryObj<typeof meta>;

const baseArgs = {
  activeBubble: "todo",
  alwaysOnTop: true,
  clickThrough: false,
  onClose: () => undefined,
  onModeChange: () => undefined,
  onToggleAlwaysOnTop: () => undefined,
  presentation: "preview",
} satisfies Partial<Story["args"]>;

const memoBubble: WidgetPreviewBubble = {
  ...getWidgetPreviewBubble("memo"),
  metric: "3",
  notificationLabel: "widget.memo.saved",
  panelBody: "widget.memo.personalBody",
  roomLabel: "widget.data.roomFallback",
  rows: [
    {
      id: "memo-paper-1",
      kind: "memo",
      label: "클라이언트 확인",
      memoBody:
        "클라이언트 확인\n수정 범위가 전체 2회인지 문서별 2회인지 메일로 다시 확인하기\n\n안녕\n고마워ㅓㅓㅓ\n잘 되는느듯\n메모가 아주 길어져도 목록에서는 두 줄만 보여야 함",
      status: "2분 전",
    },
    {
      id: "memo-paper-2",
      kind: "memo",
      label: "발표 흐름",
      memoBody: "발표 흐름\n자료 보드 공유 기준은 데모 직전에 짧게 설명하기",
      status: "18분 전",
    },
    {
      id: "memo-paper-3",
      kind: "memo",
      label: "회의 전 질문",
      memoBody:
        "회의 전 질문\n내일 오전 스탠드업에서 일정 잠금 기준 확인\n\n- 위젯에 노출되는 메모 목록은 모두 스크롤로 볼 수 있어야 함\n- 전문은 큰 메모지에서 내부 스크롤로 읽기",
      status: "오늘 13:40",
    },
    {
      id: "memo-paper-4",
      kind: "memo",
      label: "QA 확인",
      memoBody: "QA 확인\n메모 생성 입력창의 좌우 여백과 세로 중앙 정렬이 맞는지 실제 Tauri 크기에서 확인하기",
      status: "오늘 14:20",
    },
    {
      id: "memo-paper-5",
      kind: "memo",
      label: "수정 플로우",
      memoBody: "수정 플로우\n연필 아이콘을 누르면 prompt 대신 위젯 안의 큰 메모지에서 바로 편집할 수 있어야 함",
      status: "오늘 14:35",
    },
  ],
};

const barItems: WidgetWindowState[] = ["todo", "memo", "timer", "schedule", "resource", "chat", "agent"].map((activeBubble) => ({
  activeBubble: activeBubble as WidgetWindowState["activeBubble"],
  alwaysOnTop: activeBubble === "bar",
  clickThrough: false,
  dockOrbVisible: false,
  mode: "MINIMIZED",
  position: { x: 0, y: 0 },
  selectedRoomId: null,
  trayVisible: true,
  windowId: activeBubble,
  windowVisible: false,
}));

export const Default: Story = {
  args: {
    ...baseArgs,
    mode: "DEFAULT",
  },
};

export const Ghost: Story = {
  args: {
    ...baseArgs,
    clickThrough: true,
    mode: "GHOST",
  },
};

export const Minimized: Story = {
  args: {
    ...baseArgs,
    mode: "MINIMIZED",
  },
};

export const ResourceSuggestion: Story = {
  args: {
    ...baseArgs,
    activeBubble: "resource",
    mode: "TRANSLUCENT",
  },
};

export const Memo: Story = {
  args: {
    ...baseArgs,
    activeBubble: "memo",
    bubble: memoBubble,
    mode: "DEFAULT",
    onCreateMemo: () => undefined,
    onDeleteMemo: () => undefined,
    onEditMemo: () => undefined,
  },
};

export const BarHoverPreview: Story = {
  args: {
    ...baseArgs,
    mode: "DEFAULT",
  },
  render: () => (
    <div style={{ height: 640, width: 640 }}>
      <DesktopWidgetBubbleBar
        bubbleDataByType={{
          memo: memoBubble,
        }}
        minimizedItems={barItems}
        onRestoreBubble={() => undefined}
      />
    </div>
  ),
};

export const CommunicationHandoff: Story = {
  args: {
    ...baseArgs,
    activeBubble: "chat",
    mode: "DEFAULT",
  },
};
