import { AlertCircle, CalendarDays, CircleDashed, RefreshCcw } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { cn } from "@/lib/utils";

import { ScheduleOverviewPanel } from "./schedule-overview-panel";

export type CalendarPageState = "ready" | "empty" | "loading" | "error";

export type CalendarPagePanelProps = HTMLAttributes<HTMLElement> & {
  state?: CalendarPageState;
};

function CalendarStatePanel({ state }: { state: Exclude<CalendarPageState, "ready"> }) {
  const stateCopy = {
    empty: {
      action: "일정 만들기",
      description: "오늘 표시할 일정이 없습니다. TODO나 WBS에 날짜를 넣으면 일정에도 함께 보입니다.",
      icon: CalendarDays,
      title: "아직 연결된 일정이 없습니다",
    },
    error: {
      action: "다시 불러오기",
      description: "일정을 불러오지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도하세요.",
      icon: AlertCircle,
      title: "일정을 불러오지 못했습니다",
    },
    loading: {
      action: "불러오는 중",
      description: "내 TODO, WBS, Google Calendar 연결 범위를 확인하고 있습니다.",
      icon: CircleDashed,
      title: "일정을 정리하고 있습니다",
    },
  } satisfies Record<Exclude<CalendarPageState, "ready">, {
    action: string;
    description: string;
    icon: typeof CalendarDays;
    title: string;
  }>;

  const copy = stateCopy[state];
  const Icon = copy.icon;

  return (
    <GlassPanel className="calendar-page-state">
      <span className="bubli-icon-tile" aria-hidden="true">
        <Icon size={20} strokeWidth={2.1} />
      </span>
      <div>
        <Chip selected={state === "loading"}>{state === "loading" ? "로딩" : state === "error" ? "에러" : "빈 화면"}</Chip>
        <h2>{copy.title}</h2>
        <p>{copy.description}</p>
      </div>
      <Button disabled={state === "loading"} icon={<RefreshCcw size={15} strokeWidth={2.1} />} variant={state === "error" ? "primary" : "quiet"}>
        {copy.action}
      </Button>
    </GlassPanel>
  );
}

export function CalendarPagePanel({ className, state = "ready", ...props }: CalendarPagePanelProps) {
  return (
    <section className={cn("calendar-page", className)} aria-label="일정 화면" {...props}>
      {state === "ready" ? <ScheduleOverviewPanel /> : <CalendarStatePanel state={state} />}
    </section>
  );
}
