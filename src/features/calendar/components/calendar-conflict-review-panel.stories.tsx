import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  CalendarConflictReviewPanel,
  defaultCalendarConflicts,
  defaultCalendarReviewRules,
} from "./calendar-conflict-review-panel";

const meta = {
  component: CalendarConflictReviewPanel,
  parameters: {
    docs: {
      description: {
        component:
          "v14의 일정과 Google Calendar 연동 기준을 바탕으로, Bubli schedules 원본과 외부 캘린더 값을 비교하고 사용자가 확인한 값만 반영하는 충돌 확인 패널입니다.",
      },
    },
  },
  title: "Features/Calendar/CalendarConflictReviewPanel",
} satisfies Meta<typeof CalendarConflictReviewPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    conflicts: defaultCalendarConflicts,
    lastSyncedLabel: "오늘 10:24에 Google Calendar 값을 확인했습니다.",
    rules: defaultCalendarReviewRules,
  },
};

export const AllMatched: Story = {
  args: {
    conflicts: defaultCalendarConflicts.map((conflict) => ({
      ...conflict,
      googleValue: conflict.bubliValue,
      status: "MATCHED",
    })),
    lastSyncedLabel: "방금 모든 일정이 같은 값으로 확인됐습니다.",
    rules: defaultCalendarReviewRules,
    title: "일정 확인 완료",
  },
};

export const PermissionBlocked: Story = {
  args: {
    conflicts: defaultCalendarConflicts.map((conflict) => ({
      ...conflict,
      kind: "ROOM_SCOPE",
      status: "BLOCKED",
    })),
    lastSyncedLabel: "외부 캘린더 연결 권한을 다시 확인해야 합니다.",
    rules: defaultCalendarReviewRules,
    title: "캘린더 권한 확인",
  },
};
