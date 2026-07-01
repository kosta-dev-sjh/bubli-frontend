import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  FileMinus2,
  FilePenLine,
  FilePlus2,
  FolderClock,
  HardDrive,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import { Button, Chip, GlassPanel, StatusBadge } from "@/components/ui";

import styles from "./managed-folder-change-review.module.css";

type ChangeKind = "created" | "updated" | "deleted" | "conflict" | "limit";
type ChangeStatus = "LOCAL_ONLY" | "SYNC_PENDING" | "DELETE_CANDIDATE" | "CONFLICT" | "STORAGE_LIMIT_EXCEEDED";

type LocalChange = {
  fileName: string;
  folderName: string;
  kind: ChangeKind;
  note: string;
  status: ChangeStatus;
  updatedAt: string;
};

const changes: LocalChange[] = [
  {
    fileName: "회의록_0622.md",
    folderName: "Bubli/웹사이트 리뉴얼",
    kind: "created",
    note: "개인 자료함 반영 대기",
    status: "SYNC_PENDING",
    updatedAt: "방금 전",
  },
  {
    fileName: "요구사항정리_v3.pdf",
    folderName: "Bubli/요구사항 정리",
    kind: "updated",
    note: "서버 버전과 비교 필요",
    status: "CONFLICT",
    updatedAt: "8분 전",
  },
  {
    fileName: "이전_견적서.xlsx",
    folderName: "Bubli/정기 운영 업무",
    kind: "deleted",
    note: "서버 자료 삭제 여부 확인",
    status: "DELETE_CANDIDATE",
    updatedAt: "21분 전",
  },
  {
    fileName: "디자인_참고_이미지.zip",
    folderName: "Bubli/브랜드 소개서",
    kind: "limit",
    note: "개인 자료함 용량 확인 필요",
    status: "STORAGE_LIMIT_EXCEEDED",
    updatedAt: "36분 전",
  },
];

const statusMeta: Record<ChangeStatus, { label: string; tone: "pending" | "warning" | "personal" }> = {
  CONFLICT: { label: "충돌", tone: "warning" },
  DELETE_CANDIDATE: { label: "삭제 후보", tone: "warning" },
  LOCAL_ONLY: { label: "로컬만", tone: "personal" },
  STORAGE_LIMIT_EXCEEDED: { label: "용량 초과", tone: "warning" },
  SYNC_PENDING: { label: "반영 대기", tone: "pending" },
};

const kindIcon: Record<ChangeKind, React.ReactNode> = {
  conflict: <AlertTriangle size={17} strokeWidth={2.1} />,
  created: <FilePlus2 size={17} strokeWidth={2.1} />,
  deleted: <FileMinus2 size={17} strokeWidth={2.1} />,
  limit: <HardDrive size={17} strokeWidth={2.1} />,
  updated: <FilePenLine size={17} strokeWidth={2.1} />,
};

function ChangeRow({ item }: { item: LocalChange }) {
  const status = statusMeta[item.status];

  return (
    <article className={styles.changeRow}>
      <span className="bubli-icon-tile" aria-hidden="true">
        {kindIcon[item.kind]}
      </span>
      <div className={styles.changeBody}>
        <div className={styles.changeMeta}>
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <span>{item.updatedAt}</span>
          <span>{item.folderName}</span>
        </div>
        <h3>{item.fileName}</h3>
        <p>{item.note}</p>
      </div>
      <div className={styles.rowActions}>
        {item.status === "DELETE_CANDIDATE" ? (
          <>
            <Button icon={<RotateCcw size={14} />} size="sm" variant="quiet">
              복구
            </Button>
            <Button icon={<CheckCircle2 size={14} />} size="sm" variant="primary">
              삭제 반영
            </Button>
          </>
        ) : null}
        {item.status === "CONFLICT" ? (
          <>
            <Button icon={<FilePenLine size={14} />} size="sm" variant="quiet">
              비교
            </Button>
            <Button icon={<UploadCloud size={14} />} size="sm" variant="primary">
              선택 반영
            </Button>
          </>
        ) : null}
        {item.status === "SYNC_PENDING" ? (
          <Button icon={<UploadCloud size={14} />} size="sm" variant="primary">
            반영
          </Button>
        ) : null}
        {item.status === "STORAGE_LIMIT_EXCEEDED" ? (
          <Button icon={<HardDrive size={14} />} size="sm" variant="quiet">
            용량 보기
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export function ManagedFolderChangeReview() {
  return (
    <section className={styles.panel} aria-label="개인 관리 폴더 변경 검토">
      <GlassPanel className={styles.hero}>
        <div>
          <Chip icon={<FolderClock size={14} />} selected>
            변경 검토
          </Chip>
          <h2>로컬 변경은 먼저 후보로 모으고, 사용자가 고른 항목만 서버에 반영합니다</h2>
          <p>앱이 감지한 추가, 수정, 삭제, 이동 내역은 기기 안에 먼저 남깁니다. 서버 자료보드 반영은 승인된 변경분만 진행합니다.</p>
        </div>
        <div className={styles.summary}>
          <strong>4</strong>
          <span>검토할 변경</span>
          <StatusBadge tone="personal">기기 안 기록 기준</StatusBadge>
        </div>
      </GlassPanel>

      <div className={styles.flow} aria-label="로컬 변경 처리 흐름">
        <span>폴더 감지</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>변경 후보</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>사용자 확인</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>자료보드 반영</span>
      </div>

      <div className={styles.grid}>
        <GlassPanel className={styles.listPanel}>
          <div className={styles.toolbar}>
            <div>
              <h3>감지된 변경</h3>
              <p>삭제와 충돌은 바로 반영하지 않고 사용자가 확인할 수 있게 둡니다.</p>
            </div>
            <Button icon={<RefreshCw size={15} />} size="sm" variant="quiet">
              다시 스캔
            </Button>
          </div>
          <div className={styles.list}>
            {changes.map((item) => (
              <ChangeRow item={item} key={`${item.folderName}-${item.fileName}`} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className={styles.policyPanel}>
          <h3>처리 기준</h3>
          <article>
            <HardDrive size={17} strokeWidth={2.1} />
            <p>색인과 상세 변경 내역은 기기 안 임시 저장소에 먼저 저장합니다.</p>
          </article>
          <article>
            <ShieldCheck size={17} strokeWidth={2.1} />
            <p>개인 자료함 반영과 프로젝트룸 공유는 다른 승인 단계로 둡니다.</p>
          </article>
          <article>
            <Database size={17} strokeWidth={2.1} />
            <p>용량을 넘은 파일은 로컬 색인은 유지하고 서버 업로드만 막습니다.</p>
          </article>
          <article>
            <AlertTriangle size={17} strokeWidth={2.1} />
            <p>충돌은 비교 후 한쪽 버전을 선택하거나 새 버전으로 남기는 흐름을 사용합니다.</p>
          </article>
        </GlassPanel>
      </div>
    </section>
  );
}
