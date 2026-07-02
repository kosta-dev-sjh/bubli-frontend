"use client";

import type { ButtonHTMLAttributes } from "react";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { BubbleMark } from "./bubble-mark";

type BubbleBarProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  ghost?: boolean;
  schedules?: number;
  todos?: number;
};

// 위젯 최소화 상태. 클릭 시 WidgetShell Default로 펼침(상위에서 onClick 연결).
export function BubbleBar({ className, ghost = false, schedules, todos, type = "button", ...props }: BubbleBarProps) {
  const { t } = useI18n();
  const hasCount = typeof todos === "number" || typeof schedules === "number";

  return (
    <button className={cn("bubli-bubble-bar", ghost && "bubli-bubble-bar--ghost", className)} type={type} {...props}>
      <BubbleMark size="sm" />
      <span>Bubli</span>
      {hasCount ? (
        <small>
          {typeof todos === "number" ? t("bubble.bar.todos", { count: todos }) : null}
          {typeof schedules === "number" ? t("bubble.bar.schedules", { count: schedules }) : null}
        </small>
      ) : null}
    </button>
  );
}
