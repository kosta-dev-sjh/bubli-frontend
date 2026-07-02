import type { HTMLAttributes } from "react";

import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

type ChatMessageProps = HTMLAttributes<HTMLDivElement> & {
  author: string;
  message: string;
  mine?: boolean;
  roleLabel?: string;
  roleTone?: "agent" | "neutral";
  timeLabel?: string;
};

export function ChatMessage({
  author,
  className,
  message,
  mine = false,
  roleLabel,
  roleTone = "neutral",
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
            <StatusBadge tone={roleTone}>{roleLabel}</StatusBadge>
          </div>
        ) : null}
      </div>
    </div>
  );
}
