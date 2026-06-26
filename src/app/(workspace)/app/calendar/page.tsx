"use client";

import { PageHeading } from "@/components/ui/page-heading";
import { CalendarPagePanel } from "@/features/calendar/components";

export default function CalendarPage() {
  return (
    <>
      <PageHeading
        title="일정"
        description="TODO, WBS, Google Calendar에서 온 일정을 한 화면에서 확인합니다."
      />
      <CalendarPagePanel />
    </>
  );
}
