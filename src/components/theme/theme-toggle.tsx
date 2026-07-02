"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme/theme-provider";
import type { Theme } from "@/components/theme/theme-provider";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

type Option = { value: Theme; labelKey: MessageKey; icon: typeof Sun };

const OPTIONS: Option[] = [
  { value: "light", labelKey: "theme.light", icon: Sun },
  { value: "dark", labelKey: "theme.dark", icon: Moon },
  { value: "system", labelKey: "theme.system", icon: Monitor },
];

type ThemeToggleProps = {
  /** 라벨 숨기고 아이콘만 표시 */
  compact?: boolean;
};

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();

  return (
    <div aria-label={t("theme.selectAria")} className="bubli-seg" role="radiogroup">
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
            {compact ? null : <span>{t(opt.labelKey)}</span>}
          </button>
        );
      })}
    </div>
  );
}
