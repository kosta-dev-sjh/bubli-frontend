import { Clock3, FolderKanban, Gauge, Languages, Paintbrush, Save, ShieldCheck, UserRound } from "lucide-react";

import { Button, Chip, GlassPanel, StatusBadge } from "@/components/ui";

import styles from "./user-preferences-panel.module.css";

const profileFields = [
  ["이름", "담당자"],
  ["Bubli ID", "user.k"],
  ["이메일", "user@bubli.kr"],
];

const preferenceRows = [
  {
    title: "언어",
    description: "작업공간과 데스크탑 앱의 기본 언어를 맞춥니다.",
    value: "한국어",
    dbField: "표시 언어",
    icon: Languages,
  },
  {
    title: "시간대",
    description: "일정, 마감, 하루정리 날짜 계산의 기준입니다.",
    value: "Asia/Seoul",
    dbField: "시간대",
    icon: Clock3,
  },
  {
    title: "테마",
    description: "웹과 앱에서 같은 화면 톤을 씁니다.",
    value: "라이트 · 물방울",
    dbField: "화면 톤",
    icon: Paintbrush,
  },
  {
    title: "표시 밀도",
    description: "대시보드와 자료보드의 카드 간격을 사용자 기준으로 저장합니다.",
    value: "보통",
    dbField: "카드 간격",
    icon: Gauge,
  },
  {
    title: "기본 프로젝트룸",
    description: "앱을 열었을 때 먼저 볼 프로젝트룸을 지정합니다.",
    value: "Bubli 제품 개발룸",
    dbField: "처음 열 화면",
    icon: FolderKanban,
  },
];

const boundaries = [
  "프로필과 표시 설정은 내 계정 기준으로 저장합니다.",
  "기본 프로젝트룸은 화면 진입 기본값일 뿐, 프로젝트룸 멤버 권한을 바꾸지 않습니다.",
  "데스크탑 앱은 같은 작업공간을 열지만 기기 권한과 빠른 표시 기록은 별도 설정에서 관리합니다.",
  "알림, 위젯, 활동 감지 동의는 같은 설정 화면 안에 있어도 각각의 저장 정책을 따릅니다.",
];

const savedSettingRows = [
  ["프로필", "이름, Bubli ID, 프로필 이미지"],
  ["화면 표시", "언어, 시간대, 테마, 표시 밀도"],
  ["개인 기능", "알림, 기기 기능 동의, 기본 프로젝트룸"],
];

export function UserPreferencesPanel() {
  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <UserRound size={16} aria-hidden="true" />
          사용자 기본 설정
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>웹과 앱에서 같은 사용자 설정을 씁니다</h2>
            <p className={styles.summary}>
              프로필, 언어, 시간대, 테마, 표시 밀도, 기본 프로젝트룸은 사용자에게 귀속됩니다. 같은 프로젝트룸에 있어도 이 설정은
              다른 멤버에게 영향을 주지 않습니다.
            </p>
          </div>
          <StatusBadge tone="personal">내 설정</StatusBadge>
        </div>
        <div className={styles.chips} aria-label="사용자 기본 설정 저장 기준">
          <Chip selected icon={<UserRound size={14} aria-hidden="true" />}>
            내 계정 기준
          </Chip>
          <Chip icon={<ShieldCheck size={14} aria-hidden="true" />}>멤버 권한과 분리</Chip>
          <Chip icon={<FolderKanban size={14} aria-hidden="true" />}>기본 프로젝트룸</Chip>
        </div>
      </header>

      <section className={styles.layout} aria-label="프로필과 사용자 표시 설정">
        <div className={styles.profileCard}>
          <div className={styles.avatar} aria-hidden="true">
            BU
          </div>
          <div className={styles.profileCopy}>
            <h3>내 프로필</h3>
            <p>친구 검색과 프로젝트룸 멤버 표시에서 쓰는 기본 정보입니다.</p>
          </div>
          <div className={styles.profileFields}>
            {profileFields.map(([label, value]) => (
              <label className={styles.field} key={label}>
                <span>{label}</span>
                <input defaultValue={value} readOnly />
              </label>
            ))}
          </div>
          <Button icon={<Save size={16} />} variant="primary">
            프로필 저장
          </Button>
        </div>

        <div className={styles.preferenceGrid}>
          {preferenceRows.map((row) => {
            const Icon = row.icon;

            return (
              <article className={styles.preferenceCard} key={row.dbField}>
                <span className={styles.iconBubble}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <div className={styles.preferenceCopy}>
                  <h3>{row.title}</h3>
                  <p>{row.description}</p>
                  <div className={styles.meta}>
                    <StatusBadge tone="neutral">{row.dbField}</StatusBadge>
                    <Chip>{row.value}</Chip>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.bottomGrid} aria-label="사용자 설정 책임 경계">
        <div className={styles.noteCard}>
          <h3>저장 경계</h3>
          <ul className={styles.checks}>
            {boundaries.map((boundary) => (
              <li className={styles.checkItem} key={boundary}>
                <ShieldCheck size={16} aria-hidden="true" />
                <span>{boundary}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.noteCard}>
          <h3>저장되는 설정</h3>
          <div className={styles.apiList}>
            {savedSettingRows.map(([label, description]) => (
              <div className={styles.apiRow} key={label + description}>
                <StatusBadge tone="personal">{label}</StatusBadge>
                <div>
                  <strong>{label} 설정</strong>
                  <span>{description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </GlassPanel>
  );
}
