import { CheckCircle2, Clock3, MessageCircle, Search, ShieldAlert, UserPlus, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

import { Button, Chip, GlassPanel, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/utils";

import styles from "./friend-search-panel.module.css";

type SearchResultStatus = "NONE" | "PENDING_SENT" | "PENDING_RECEIVED" | "FRIEND" | "BLOCKED";

type FriendSearchResult = {
  bubliId: string;
  displayName: string;
  id: string;
  lastProjectLabel?: string;
  status: SearchResultStatus;
};

const searchResults: FriendSearchResult[] = [
  {
    bubliId: "miyeon",
    displayName: "김팀원 C",
    id: "user-1",
    lastProjectLabel: "신규 홈페이지 리뉴얼",
    status: "NONE",
  },
  {
    bubliId: "junhwa",
    displayName: "홍준화",
    id: "user-2",
    lastProjectLabel: "API 기준 정리",
    status: "PENDING_SENT",
  },
  {
    bubliId: "damin",
    displayName: "정다민",
    id: "user-3",
    lastProjectLabel: "Bubli 발표 자료",
    status: "FRIEND",
  },
  {
    bubliId: "blocked-user",
    displayName: "차단된 사용자",
    id: "user-4",
    status: "BLOCKED",
  },
];

const statusCopy: Record<SearchResultStatus, { label: string; tone: "neutral" | "pending" | "success" | "warning" }> = {
  BLOCKED: { label: "차단됨", tone: "warning" },
  FRIEND: { label: "친구", tone: "success" },
  NONE: { label: "요청 가능", tone: "neutral" },
  PENDING_RECEIVED: { label: "받은 요청", tone: "pending" },
  PENDING_SENT: { label: "요청 대기", tone: "pending" },
};

export function FriendSearchPanel() {
  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div>
          <Chip selected>친구 추가</Chip>
          <h2 className={styles.title}>Bubli ID로 찾기</h2>
          <p className={styles.description}>
            사용자를 검색해 친구 요청을 보냅니다. 상대가 수락한 뒤에 1:1 채팅과 프로젝트룸 친구 초대가 열립니다.
          </p>
        </div>
        <StatusBadge tone="room">서버 상태 기준</StatusBadge>
      </header>

      <form className={styles.searchBox} aria-label="Bubli ID 검색">
        <label className={styles.inputLabel} htmlFor="bubli-id-search">
          Bubli ID
        </label>
        <div className={styles.inputWrap}>
          <Search aria-hidden="true" size={18} />
          <input id="bubli-id-search" placeholder="예: miyeon" type="search" />
        </div>
        <Button icon={<Search size={16} />} variant="primary">
          검색
        </Button>
      </form>

      <div className={styles.flowLine} aria-label="친구 추가 흐름">
        <FlowStep icon={<Search size={16} />} label="ID 검색" />
        <FlowStep icon={<UserPlus size={16} />} label="요청 전송" />
        <FlowStep icon={<CheckCircle2 size={16} />} label="상대 수락" />
        <FlowStep icon={<MessageCircle size={16} />} label="1:1 채팅" />
      </div>

      <section className={styles.resultSection} aria-labelledby="friend-search-result-title">
        <div className={styles.sectionHeader}>
          <h3 id="friend-search-result-title">검색 결과</h3>
          <span>중복 요청과 차단 상태는 서버 상태를 기준으로 막습니다.</span>
        </div>
        <div className={styles.resultList}>
          {searchResults.map((result) => (
            <FriendSearchResultRow key={result.id} result={result} />
          ))}
        </div>
      </section>
    </GlassPanel>
  );
}

function FlowStep({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className={styles.flowStep}>
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}

function FriendSearchResultRow({ result }: { result: FriendSearchResult }) {
  const status = statusCopy[result.status];

  return (
    <article className={cn(styles.resultRow, result.status === "BLOCKED" && styles.resultRowMuted)}>
      <Avatar name={result.displayName} muted={result.status === "BLOCKED"} />
      <div className={styles.resultMain}>
        <strong>{result.displayName}</strong>
        <span>
          @{result.bubliId}
          {result.lastProjectLabel ? ` · ${result.lastProjectLabel}` : ""}
        </span>
      </div>
      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      <ResultAction status={result.status} />
    </article>
  );
}

function ResultAction({ status }: { status: SearchResultStatus }) {
  if (status === "NONE") {
    return (
      <Button icon={<UserPlus size={15} />} size="sm" variant="primary">
        친구 요청
      </Button>
    );
  }

  if (status === "PENDING_SENT") {
    return (
      <Button icon={<Clock3 size={15} />} size="sm" variant="quiet">
        요청 확인
      </Button>
    );
  }

  if (status === "PENDING_RECEIVED") {
    return (
      <Button icon={<CheckCircle2 size={15} />} size="sm" variant="primary">
        요청 수락
      </Button>
    );
  }

  if (status === "FRIEND") {
    return (
      <div className={styles.actionPair}>
        <Button icon={<MessageCircle size={15} />} size="sm" variant="quiet">
          1:1 채팅
        </Button>
        <Button icon={<UsersRound size={15} />} size="sm" variant="secondary">
          초대 대상
        </Button>
      </div>
    );
  }

  return (
    <Button disabled icon={<ShieldAlert size={15} />} size="sm" variant="ghost">
      요청 차단
    </Button>
  );
}

function Avatar({ muted = false, name }: { muted?: boolean; name: string }) {
  return (
    <span className={cn(styles.avatar, muted && styles.avatarMuted)} aria-hidden="true">
      {name.slice(0, 1)}
    </span>
  );
}
