"use client";

import { PageHeading } from "@/components/ui/page-heading";
import { ActivityDetectionPanel } from "@/features/activity/components";
import {
  CalendarConflictReviewPanel,
  defaultCalendarConflicts,
  defaultCalendarReviewRules,
  GoogleCalendarSyncPanel,
  ScheduleOverviewPanel,
} from "@/features/calendar/components";
import {
  defaultFolderEvents,
  defaultFolderHandoffRules,
  ManagedFolderChangeReview,
  ManagedFolderIndexPanel,
  ManagedFolderPolicyPanel,
  ManagedFolderS3HandoffPanel,
  ManagedFolderSyncPanel,
  StorageSyncPolicyPanel,
} from "@/features/managed-folder/components";
import { NotificationCenterPanel, NotificationRoutingBoundaryPanel } from "@/features/notification/components";
import {
  AccessBoundaryMatrixPanel,
  AccessibilityKeyboardNavigationPanel,
  ApiContractAdapterBoundaryPanel,
  ApiContractStatusPanel,
  ApiErrorHandlingBoundaryPanel,
  DataDeletionRequestPanel,
  defaultBackupSnapshots,
  defaultDeletionChecks,
  defaultDeletionOptions,
  defaultKeyboardRules,
  defaultKeyboardTargets,
  defaultRecoveryItems,
  DeviceDataRecoveryMapPanel,
  FontStrategyPanel,
  LanguagePreferencesPanel,
  LocalBackupRecoveryPanel,
  LocalSyncOutboxPanel,
  NotificationPreferencesPanel,
  PrivacyConsentPanel,
  SettingsLocalPanel,
  TauriSyncStatusPanel,
  ThemeContrastPanel,
  UserPreferencesPanel,
} from "@/features/settings/components";
import {
  defaultSyncItems,
  defaultTimerRecoveryState,
  defaultTimerRules,
  TimerControlPanel,
  TimerRecoveryBoundaryPanel,
  TimerRecoveryPanel,
} from "@/features/timer/components";

const accessBoundaryItems = [
  {
    allowed: "본인이 올린 개인 자료와 직접 공유 승인한 자료만 볼 수 있습니다.",
    blocked: "개인 자료는 프로젝트룸에 자동으로 노출되지 않습니다.",
    dataName: "개인 자료",
    note: "자료보드에서 프로젝트룸 공유를 선택한 뒤에만 room_resource 흐름으로 넘어갑니다.",
    ownerLabel: "사용자 소유",
    status: "allowed" as const,
    storageLabel: "서버 DB + S3",
    tone: "personal" as const,
  },
  {
    allowed: "프로젝트룸 멤버는 프로젝트룸 멤버 권한 기준으로 자료, WBS, TODO, 채팅을 봅니다.",
    blocked: "친구가 아니거나 초대를 수락하지 않은 사용자는 프로젝트룸 자료에 접근하지 못합니다.",
    dataName: "프로젝트룸 자료",
    note: "프로젝트와 프로젝트룸은 분리하지 않고 project_room 하나를 업무 단위로 씁니다.",
    ownerLabel: "프로젝트룸 기준",
    status: "limited" as const,
    storageLabel: "서버 DB + S3",
    tone: "room" as const,
  },
  {
    allowed: "개인 에이전트 원문, 위젯 상세 이벤트, 로컬 대기열은 기기 안 저장소에만 둡니다.",
    blocked: "개인 에이전트 원문과 상세 사용 이벤트 원문은 서버로 보내지 않습니다.",
    dataName: "기기 안 데이터",
    note: "서버에 필요한 값은 승인된 하루정리, 항목 상태, 날짜별 집계처럼 요약된 데이터만 반영합니다.",
    ownerLabel: "기기별 보관",
    status: "limited" as const,
    storageLabel: "기기 안 저장소",
    tone: "local" as const,
  },
  {
    allowed: "버블은 사용자가 접근할 수 있는 기준 데이터를 개인 기준으로 요약해 보여줍니다.",
    blocked: "버블은 프로젝트룸 화면을 복제하지 않고, 사용 권한 밖의 자료를 표시하지 않습니다.",
    dataName: "버블 표시 데이터",
    note: "TODO, 일정, 채팅, 알림, 타이머 기록은 서버 기준이고 상세 위젯 이벤트는 기기 안에 둡니다.",
    ownerLabel: "사용자 개인 영역",
    status: "allowed" as const,
    storageLabel: "서버 기준 + 기기 안 임시 보관",
    tone: "widget" as const,
  },
];

export default function SettingsPage() {
  return (
    <>
      <PageHeading
        title="설정"
        description="사용자별 알림, 개인정보 동의, 기기 안 저장, 백업과 삭제 요청을 한 흐름으로 확인합니다."
      />
      <div className="page-grid">
        <UserPreferencesPanel />
        <LanguagePreferencesPanel />
        <ThemeContrastPanel />
        <FontStrategyPanel />
        <SettingsLocalPanel />
        <PrivacyConsentPanel />
        <NotificationPreferencesPanel />
        <NotificationCenterPanel />
        <NotificationRoutingBoundaryPanel />
        <TauriSyncStatusPanel />
        <AccessBoundaryMatrixPanel items={accessBoundaryItems} />
        <ApiContractStatusPanel />
        <ApiContractAdapterBoundaryPanel />
        <ApiErrorHandlingBoundaryPanel />
        <AccessibilityKeyboardNavigationPanel rules={defaultKeyboardRules} targets={defaultKeyboardTargets} />
        <DeviceDataRecoveryMapPanel backupSnapshots={defaultBackupSnapshots} items={defaultRecoveryItems} />
        <ActivityDetectionPanel />
        <ManagedFolderPolicyPanel />
        <ManagedFolderIndexPanel />
        <ManagedFolderChangeReview />
        <ManagedFolderSyncPanel />
        <StorageSyncPolicyPanel />
        <ManagedFolderS3HandoffPanel
          events={defaultFolderEvents}
          folderName="개인 관리 폴더"
          quotaPercent={82}
          rules={defaultFolderHandoffRules}
          selectedProjectRoom="번역 프로젝트룸"
        />
        <ScheduleOverviewPanel />
        <GoogleCalendarSyncPanel />
        <CalendarConflictReviewPanel
          conflicts={defaultCalendarConflicts}
          lastSyncedLabel="오늘 10:20"
          rules={defaultCalendarReviewRules}
        />
        <TimerControlPanel />
        <TimerRecoveryBoundaryPanel
          recoveryPercent={86}
          recoveryState={defaultTimerRecoveryState}
          rules={defaultTimerRules}
          syncItems={defaultSyncItems}
        />
        <TimerRecoveryPanel />
        <LocalSyncOutboxPanel />
        <LocalBackupRecoveryPanel />
        <DataDeletionRequestPanel checks={defaultDeletionChecks} options={defaultDeletionOptions} />
      </div>
    </>
  );
}
