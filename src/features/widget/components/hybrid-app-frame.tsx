import { Bell, Bot, Database, FolderOpen, Globe2, LayoutDashboard, MessageCircle, Mic2, Monitor, ShieldCheck, Sparkles } from "lucide-react";

import { Chip, GlassPanel, StatusBadge } from "@/components/ui";

import styles from "./hybrid-app-frame.module.css";

const webTabs = ["대시보드", "프로젝트룸", "자료보드", "WBS/TODO", "설정"];

const webCards = [
  ["오늘 내 TODO", "여러 프로젝트룸의 내 작업을 모아 봅니다."],
  ["자료보드", "개인 자료와 프로젝트룸 자료를 권한 기준으로 엽니다."],
  ["에이전트 후보", "승인 전 후보만 검토 화면에 표시합니다."],
  ["위젯 표시", "선택한 항목만 개인 버블에 표시합니다."],
];

const localCards = [
  {
    title: "개인 관리 폴더",
    body: "사용자가 지정한 폴더만 scan/watch 합니다. 전체 PC 자동 색인은 하지 않습니다.",
    icon: FolderOpen,
  },
  {
    title: "로컬 SQLite",
    body: "개인 에이전트 원문, 폴더 색인, 위젯 상세 이벤트, 복구 대기열을 기기 안에 둡니다.",
    icon: Database,
  },
  {
    title: "소통 전용 창",
    body: "앱에서 소통 탭을 숨기더라도 별도 창이나 버블에서 같은 채팅/보이스 연결을 씁니다.",
    icon: MessageCircle,
  },
  {
    title: "권한 안전",
    body: "프로젝트룸 데이터는 멤버 권한을 확인한 뒤 자료, WBS/TODO, 일정, 다운로드에 접근합니다.",
    icon: ShieldCheck,
  },
];

const connectionRows = [
  ["메인 WebView", "/app", "회원 웹 앱 화면"],
  ["Tauri 소통 창", "/app/desktop/communication", "같은 API, WebSocket, LiveKit 연결"],
  ["보이스 연결", "API 서버 토큰", "LiveKit key와 secret은 서버 전용으로 관리"],
  ["로컬 기능", "Tauri IPC", "폴더 선택, SQLite, 활동 감지, 위젯 복구"],
];

export function HybridAppFrame() {
  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <Monitor size={16} aria-hidden="true" />
          Tauri 하이브리드 앱
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>같은 회원 웹 앱에 데스크탑 기능만 얹습니다</h2>
            <p className={styles.summary}>
              Tauri 앱은 별도 서비스를 새로 만드는 방식이 아닙니다. 배포된 회원 웹 앱을 WebView로 열고, 앱에서만 필요한 버블,
              개인 관리 폴더, 로컬 SQLite, 활동 감지, 전용 소통 창을 붙입니다.
            </p>
          </div>
          <StatusBadge tone="personal">Tauri WebView</StatusBadge>
        </div>
        <div className={styles.chips} aria-label="하이브리드 앱 기준">
          <Chip selected icon={<Globe2 size={14} aria-hidden="true" />}>
            같은 회원 화면
          </Chip>
          <Chip icon={<MessageCircle size={14} aria-hidden="true" />}>소통 창 분리 가능</Chip>
          <Chip icon={<Mic2 size={14} aria-hidden="true" />}>LiveKit 토큰은 서버 발급</Chip>
        </div>
      </header>

      <section className={styles.layout} aria-label="회원 웹 앱과 Tauri 앱 구조">
        <div className={styles.window}>
          <div className={styles.windowBar}>
            <span />
            <span />
            <span />
            <strong>Bubli Tauri WebView · /app</strong>
          </div>
          <div className={styles.windowBody}>
            <aside className={styles.sidebar}>
              <div className={styles.brand}>Bubli</div>
              {webTabs.map((tab) => (
                <span className={tab === "프로젝트룸" ? styles.activeTab : ""} key={tab}>
                  {tab}
                </span>
              ))}
            </aside>
            <main className={styles.webApp}>
              <div className={styles.webHeader}>
                <div>
                  <h3>토모에 번역 프로젝트룸</h3>
                  <p>자료 12개 · TODO 18개 · 확인 필요 3개</p>
                </div>
                <StatusBadge tone="room">회원 웹 앱</StatusBadge>
              </div>
              <div className={styles.cardGrid}>
                {webCards.map(([title, body]) => (
                  <article className={styles.webCard} key={title}>
                    <h4>{title}</h4>
                    <p>{body}</p>
                  </article>
                ))}
              </div>
            </main>
          </div>
        </div>

        <aside className={styles.appLayer} aria-label="Tauri 앱 전용 기능">
          <div className={styles.layerHeader}>
            <Sparkles size={18} aria-hidden="true" />
            <h3>앱에서만 붙는 기능</h3>
          </div>
          <div className={styles.localList}>
            {localCards.map((card) => {
              const Icon = card.icon;

              return (
                <article className={styles.localCard} key={card.title}>
                  <span className={styles.localIcon}>
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <h4>{card.title}</h4>
                    <p>{card.body}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </aside>
      </section>

      <section className={styles.connectionGrid} aria-label="웹과 Tauri 연결 기준">
        {connectionRows.map(([title, path, body]) => (
          <article className={styles.connectionCard} key={title}>
            <div className={styles.connectionTitle}>
              {title === "보이스 연결" ? <Mic2 size={16} aria-hidden="true" /> : title === "로컬 기능" ? <Database size={16} aria-hidden="true" /> : <LayoutDashboard size={16} aria-hidden="true" />}
              <h3>{title}</h3>
            </div>
            <strong>{path}</strong>
            <p>{body}</p>
          </article>
        ))}
      </section>

      <div className={styles.statusStrip}>
        <span>
          <Bell size={14} aria-hidden="true" />
          서버 원본 데이터는 API에서 다시 불러올 수 있습니다.
        </span>
        <span>
          <Bot size={14} aria-hidden="true" />
          개인 에이전트 원문과 로컬 이벤트는 기기 안에 둡니다.
        </span>
      </div>
    </GlassPanel>
  );
}
