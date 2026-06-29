import { AlertTriangle, Archive, CheckCircle2, CloudOff, DatabaseBackup, HardDrive, RotateCcw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

type BackupItem = {
  title: string;
  createdAt: string;
  size: string;
  status: "valid" | "latest" | "old";
};

const backups: BackupItem[] = [
  {
    createdAt: "오늘 14:20",
    size: "18.4MB",
    status: "latest",
    title: "자동 백업",
  },
  {
    createdAt: "어제 22:10",
    size: "17.9MB",
    status: "valid",
    title: "하루정리 후 백업",
  },
  {
    createdAt: "6월 20일 18:02",
    size: "16.1MB",
    status: "old",
    title: "앱 업데이트 전 백업",
  },
];

const statusMeta: Record<BackupItem["status"], { label: string; tone: "success" | "approved" | "neutral" }> = {
  latest: { label: "최신", tone: "approved" },
  old: { label: "보관", tone: "neutral" },
  valid: { label: "정상", tone: "success" },
};

function BackupRow({ item }: { item: BackupItem }) {
  const status = statusMeta[item.status];

  return (
    <article className="local-backup-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <Archive size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="local-backup-row__meta">
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <span>{item.createdAt}</span>
          <span>{item.size}</span>
        </div>
        <h3>{item.title}</h3>
      </div>
      <Button size="sm" variant="quiet">
        확인
      </Button>
    </article>
  );
}

export function LocalBackupRecoveryPanel() {
  return (
    <section className="local-backup" aria-label="로컬 백업과 복구">
      <GlassPanel className="local-backup__hero">
        <div>
          <Chip icon={<DatabaseBackup size={14} />} selected>
            로컬 백업
          </Chip>
          <h2>서버에 원문을 올리지 않는 개인 데이터는 기기 안에서 백업합니다</h2>
          <p>
            개인 에이전트 원문, 위젯 상세 사용 이벤트, 로컬 설정은 기본적으로 서버에 저장하지 않습니다. 대신
            앱 종료, 하루정리, 업데이트 전 같은 시점에 암호화된 로컬 백업을 만듭니다.
          </p>
        </div>
        <div className="local-backup__summary">
          <StatusBadge tone="success">정상</StatusBadge>
          <strong>7개</strong>
          <span>보관 중인 백업</span>
          <ProgressBar label="백업 보관 용량" value={54} />
        </div>
      </GlassPanel>

      <div className="local-backup__grid">
        <GlassPanel className="local-backup__list">
          <div className="local-backup__list-top">
            <div>
              <h3>백업 목록</h3>
              <p>최근 일일 백업과 주간 백업을 제한된 개수만 보관합니다.</p>
            </div>
            <Button icon={<DatabaseBackup size={15} />} size="sm" variant="primary">
              지금 백업
            </Button>
          </div>
          <div className="local-backup__items">
            {backups.map((item) => (
              <BackupRow item={item} key={`${item.title}-${item.createdAt}`} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="local-backup__recovery">
          <h3>복구 기준</h3>
          <div>
            <ShieldCheck size={17} strokeWidth={2.1} />
            <p>프로젝트룸 채팅, TODO, 일정, 타이머 원본은 서버에서 다시 내려받습니다.</p>
          </div>
          <div>
            <HardDrive size={17} strokeWidth={2.1} />
            <p>개인 에이전트 원문과 위젯 상세 이벤트는 로컬 백업이 있을 때만 복구합니다.</p>
          </div>
          <div>
            <CloudOff size={17} strokeWidth={2.1} />
            <p>백업이 없으면 복구할 수 없는 항목을 사용자에게 분명히 알려줍니다.</p>
          </div>
          <div>
            <RotateCcw size={17} strokeWidth={2.1} />
            <p>복구 전 손상된 파일은 별도로 보관하고, 최신 정상 백업을 적용합니다.</p>
          </div>
        </GlassPanel>
      </div>

      <div className="local-backup__policy">
        <GlassPanel>
          <CheckCircle2 size={18} strokeWidth={2.1} />
          <h3>서버 기록 데이터</h3>
          <p>프로젝트룸 채팅과 위젯 표시 데이터는 서버 기록을 기준으로 다시 가져옵니다.</p>
        </GlassPanel>
        <GlassPanel>
          <AlertTriangle size={18} strokeWidth={2.1} />
          <h3>로컬 전용 데이터</h3>
          <p>개인 원문 대화와 상세 사용 이벤트는 백업이 없으면 복구하지 않습니다.</p>
        </GlassPanel>
      </div>
    </section>
  );
}
