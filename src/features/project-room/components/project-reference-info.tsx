"use client";

import { CalendarClock, CheckCircle2, CircleDollarSign, FileCheck2, ShieldAlert } from "lucide-react";

import { Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

import styles from "./project-reference-info.module.css";

const referenceItems: Array<{
  labelKey: MessageKey;
  valueKey: MessageKey;
  noteKey: MessageKey;
  tone: "personal" | "warning" | "pending" | "room";
}> = [
  {
    labelKey: "room.reference.amountLabel",
    valueKey: "room.reference.amount1Value",
    noteKey: "room.reference.amount1Note",
    tone: "personal",
  },
  {
    labelKey: "room.reference.amountLabel",
    valueKey: "room.reference.amount2Value",
    noteKey: "room.reference.amount2Note",
    tone: "warning",
  },
  {
    labelKey: "room.reference.dueLabel",
    valueKey: "room.reference.dueValue",
    noteKey: "room.reference.dueNote",
    tone: "pending",
  },
  {
    labelKey: "room.reference.statusLabel",
    valueKey: "room.reference.statusValue",
    noteKey: "room.reference.statusNote",
    tone: "room",
  },
];

const checkItems: Array<[MessageKey, MessageKey]> = [
  ["room.reference.check1Title", "room.reference.check1Body"],
  ["room.reference.check2Title", "room.reference.check2Body"],
  ["room.reference.check3Title", "room.reference.check3Body"],
];

const boundaryItems: MessageKey[] = [
  "room.reference.boundary1",
  "room.reference.boundary2",
  "room.reference.boundary3",
  "room.reference.boundary4",
];

export function ProjectReferenceInfo() {
  const { t } = useI18n();
  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <CircleDollarSign size={16} aria-hidden="true" />
          {t("room.reference.eyebrow")}
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>{t("room.reference.title")}</h2>
            <p className={styles.summary}>{t("room.reference.summary")}</p>
          </div>
          <StatusBadge tone="pending">{t("room.reference.draftBadge")}</StatusBadge>
        </div>
      </header>

      <section className={styles.referenceGrid} aria-label={t("room.reference.referenceAria")}>
        {referenceItems.map((item, index) => (
          <article className={styles.referenceCard} key={`${item.valueKey}-${index}`}>
            <div className={styles.cardTop}>
              <span>{t(item.labelKey)}</span>
              <StatusBadge tone={item.tone}>{t(item.noteKey)}</StatusBadge>
            </div>
            <strong>{t(item.valueKey)}</strong>
          </article>
        ))}
      </section>

      <section className={styles.contentGrid} aria-label={t("room.reference.contentAria")}>
        <div className={styles.checkPanel}>
          <div className={styles.panelTitle}>
            <FileCheck2 size={18} aria-hidden="true" />
            <h3>{t("room.reference.checkTitle")}</h3>
          </div>
          <div className={styles.checkList}>
            {checkItems.map(([titleKey, bodyKey]) => (
              <article className={styles.checkItem} key={titleKey}>
                <span>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  {t(titleKey)}
                </span>
                <p>{t(bodyKey)}</p>
              </article>
            ))}
          </div>
        </div>

        <aside className={styles.boundaryPanel} aria-label={t("room.reference.boundaryAria")}>
          <div className={styles.panelTitle}>
            <ShieldAlert size={18} aria-hidden="true" />
            <h3>{t("room.reference.boundaryTitle")}</h3>
          </div>
          <div className={styles.boundaryList}>
            {boundaryItems.map((itemKey) => (
              <span key={itemKey}>{t(itemKey)}</span>
            ))}
          </div>
          <p>{t("room.reference.boundaryNote")}</p>
        </aside>
      </section>

      <footer className={styles.footer}>
        <Chip selected icon={<CalendarClock size={14} aria-hidden="true" />}>
          {t("room.reference.footerReference")}
        </Chip>
        <Chip icon={<FileCheck2 size={14} aria-hidden="true" />}>{t("room.reference.footerSave")}</Chip>
        <Chip icon={<CircleDollarSign size={14} aria-hidden="true" />}>{t("room.reference.footerScope")}</Chip>
      </footer>
    </GlassPanel>
  );
}
