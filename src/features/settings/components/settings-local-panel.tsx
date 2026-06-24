import {
  Bell,
  DatabaseZap,
  EyeOff,
  FolderSearch,
  HardDriveDownload,
  Languages,
  MonitorCog,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";

type SettingRow = {
  description: string;
  label: string;
  state: "on" | "off" | "ready" | "device" | "shared";
};

const preferenceRows: SettingRow[] = [
  {
    description: "한국어 화면, 서울 시간대 기준으로 표시합니다.",
    label: "언어와 시간대",
    state: "ready",
  },
  {
    description: "밝은 기본 화면과 블랙화이트 다크 테마를 전환합니다.",
    label: "테마",
    state: "ready",
  },
  {
    description: "버블과 대시보드 글자 크기를 함께 조정합니다.",
    label: "글자 크기",
    state: "ready",
  },
];

const notificationRows: SettingRow[] = [
  {
    description: "프로젝트룸 자료 댓글과 멘션을 알려줍니다.",
    label: "소통 알림",
    state: "on",
  },
  {
    description: "에이전트가 후보 생성을 마치면 알려줍니다.",
    label: "에이전트 제안 알림",
    state: "on",
  },
  {
    description: "하루정리 시간은 사용자가 직접 켤 수 있습니다.",
    label: "하루정리 알림",
    state: "off",
  },
];

const widgetRows: SettingRow[] = [
  {
    description: "TODO, 에이전트, 소통, 타이머, 메모 버블을 켭니다.",
    label: "버블 표시",
    state: "shared",
  },
  {
    description: "위치, 크기, 최소화, 고스트 모드를 저장합니다.",
    label: "버블 배치",
    state: "shared",
  },
  {
    description: "열기, 닫기, 클릭 같은 상세 이벤트는 기기 안에 둡니다.",
    label: "버블 사용 기록",
    state: "device",
  },
];

const localRows: SettingRow[] = [
  {
    description: "사용자가 직접 고른 폴더만 살펴보고 변경을 감지합니다.",
    label: "개인 관리 폴더",
    state: "device",
  },
  {
    description: "개인 에이전트 대화와 버블 상세 사용 기록은 기기 안에 보관합니다.",
    label: "기기 안 보관",
    state: "device",
  },
  {
    description: "네트워크가 끊겼을 때 남은 타이머와 버블 집계를 나중에 다시 반영합니다.",
    label: "반영 대기 작업",
    state: "ready",
  },
];

const privacyRows: SettingRow[] = [
  {
    description: "앱 이름, 창 제목, 머문 시간만 다룹니다.",
    label: "활동 감지 동의",
    state: "off",
  },
  {
    description: "화면 전체 내용과 키보드 입력은 수집하지 않습니다.",
    label: "수집 제한",
    state: "ready",
  },
  {
    description: "개인 관리 폴더의 파일은 사용자가 직접 공유할 때만 프로젝트룸에 보입니다.",
    label: "공유 승인",
    state: "ready",
  },
];

function stateBadge(state: SettingRow["state"]) {
  const map = {
    device: { label: "기기 안", tone: "memo" },
    off: { label: "꺼짐", tone: "neutral" },
    on: { label: "켜짐", tone: "success" },
    ready: { label: "준비됨", tone: "approved" },
    shared: { label: "웹과 앱", tone: "todo" },
  } as const;
  const item = map[state];
  return <StatusBadge tone={item.tone}>{item.label}</StatusBadge>;
}

function SettingGroup({
  icon: Icon,
  rows,
  title,
}: {
  icon: typeof SlidersHorizontal;
  rows: SettingRow[];
  title: string;
}) {
  return (
    <GlassPanel className="settings-group">
      <div className="settings-group__head">
        <span className="bubli-icon-tile" aria-hidden="true">
          <Icon size={18} strokeWidth={2.1} />
        </span>
        <h3>{title}</h3>
      </div>
      <div className="settings-group__rows">
        {rows.map((row) => (
          <div className="settings-row" key={row.label}>
            <div>
              <b>{row.label}</b>
              <span>{row.description}</span>
            </div>
            {stateBadge(row.state)}
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

const summaryItems = [
  {
    description: "알림, 버블 배치, 글자 크기처럼 사용자가 직접 고르는 값입니다.",
    icon: SlidersHorizontal,
    title: "내가 고르는 설정",
  },
  {
    description: "TODO, 일정, 채팅, 타이머처럼 웹과 데스크톱 앱에서 함께 보는 값입니다.",
    icon: DatabaseZap,
    title: "함께 쓰는 작업값",
  },
  {
    description: "개인 에이전트 대화, 상세 사용 기록, 복구 대기 작업처럼 기기 안에 남는 값입니다.",
    icon: HardDriveDownload,
    title: "기기 안에 두는 값",
  },
];

function SettingsSummaryStrip() {
  return (
    <GlassPanel className="settings-summary" padded={false}>
      {summaryItems.map((item) => {
        const Icon = item.icon;
        return (
          <div className="settings-summary__item" key={item.title}>
            <span className="bubli-icon-tile" aria-hidden="true">
              <Icon size={17} strokeWidth={2.1} />
            </span>
            <div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          </div>
        );
      })}
    </GlassPanel>
  );
}

function LocalRecoveryPanel() {
  return (
    <GlassPanel className="settings-recovery">
      <div>
        <Chip selected icon={<HardDriveDownload size={14} strokeWidth={2.1} />}>
          기기 안 복구
        </Chip>
        <h3>개인 보관함 백업과 복구</h3>
        <p>
          개인 에이전트 원문은 Bubli 계정에 그대로 올리지 않으므로, 앱 종료 전과 하루정리 후 기기 안에 백업을 남깁니다.
          백업이 없으면 원문 대화는 복구할 수 없고, 사용자가 확인한 하루정리만 다시 볼 수 있습니다.
        </p>
      </div>
      <div className="settings-recovery__actions">
        <Button icon={<RotateCcw size={16} />} variant="quiet">
          백업 점검
        </Button>
        <Button icon={<DatabaseZap size={16} />} variant="primary">
          지금 백업
        </Button>
      </div>
    </GlassPanel>
  );
}

export function SettingsLocalPanel() {
  return (
    <section className="settings-local-panel" aria-label="사용자 설정과 기기 안 기능">
      <SectionHeading
        eyebrow="설정"
        title="내 설정과 기기 안 기록을 한곳에서 관리합니다"
        description="알림, 버블, 폴더, 활동 감지 동의는 사용자별로 저장됩니다. 웹과 함께 보는 작업값은 같은 기준을 쓰고, 개인 대화와 상세 사용 기록은 기기 안에서 복구와 대기 작업을 맡습니다."
      />

      <SettingsSummaryStrip />

      <div className="settings-local-panel__grid">
        <SettingGroup icon={Languages} rows={preferenceRows} title="프로필과 표시" />
        <SettingGroup icon={Bell} rows={notificationRows} title="알림" />
        <SettingGroup icon={MonitorCog} rows={widgetRows} title="버블 설정" />
        <SettingGroup icon={FolderSearch} rows={localRows} title="개인 관리 폴더와 기기 안 보관" />
        <SettingGroup icon={ShieldCheck} rows={privacyRows} title="개인정보 동의" />
      </div>

      <div className="settings-local-panel__safety">
        <GlassPanel className="settings-permission">
          <span className="bubli-icon-tile" aria-hidden="true">
            <EyeOff size={18} strokeWidth={2.1} />
          </span>
          <div>
            <h3>접근하지 않는 것</h3>
            <p>PC 전체 자동 검색, 화면 전체 내용, 키보드 입력은 다루지 않습니다.</p>
            <div className="settings-permission__chips">
              <Chip>사용자 선택 폴더만</Chip>
              <Chip>공유 전 개인 자료</Chip>
              <Chip>개인 원문은 기기 안에</Chip>
            </div>
          </div>
        </GlassPanel>

        <LocalRecoveryPanel />
      </div>
    </section>
  );
}
