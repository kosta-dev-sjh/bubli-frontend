import type { HTMLAttributes } from "react";

import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

type ChatMessageProps = HTMLAttributes<HTMLDivElement> & {
  author: string;
  message: string;
  mine?: boolean;
  roleLabel?: "프리랜서 사용자" | "프로젝트룸 에이전트";
  timeLabel?: string;
};

export function ChatMessage({
  author,
  className,
  message,
  mine = false,
  roleLabel,
  timeLabel,
  ...props
}: ChatMessageProps) {
  return (
    <div className={cn("bubli-chat-message", mine && "bubli-chat-message--mine", className)} {...props}>
      <div className="bubli-chat-message__bubble">
        <span className="bubli-chat-message__author">
          {author}
          {timeLabel ? ` · ${timeLabel}` : ""}
        </span>
        <p className="bubli-chat-message__text">{message}</p>
        {roleLabel ? (
          <div style={{ marginTop: 8 }}>
            <StatusBadge tone={roleLabel === "프로젝트룸 에이전트" ? "agent" : "neutral"}>{roleLabel}</StatusBadge>
          </div>
        ) : null}
      </div>
    </div>
  );
}
