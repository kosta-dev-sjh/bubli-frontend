"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme/theme-provider";
import type { Theme } from "@/components/theme/theme-provider";

type Option = { value: Theme; label: string; icon: typeof Sun };

const OPTIONS: Option[] = [
  { value: "light", label: "라이트", icon: Sun },
  { value: "dark", label: "다크", icon: Moon },
  { value: "system", label: "시스템", icon: Monitor },
];

type ThemeToggleProps = {
  /** 라벨 숨기고 아이콘만 표시 */
  compact?: boolean;
};

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div aria-label="테마 선택" className="bubli-seg" role="radiogroup">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = theme === opt.value;
        return (
          <button
            aria-checked={active}
            className={active ? "bubli-seg__item is-active" : "bubli-seg__item"}
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            role="radio"
            type="button"
          >
            <Icon aria-hidden className="bubli-seg__icon" size={15} strokeWidth={1.8} />
            {compact ? null : <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
