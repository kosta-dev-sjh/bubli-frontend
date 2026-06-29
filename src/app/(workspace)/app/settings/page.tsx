"use client";

import { PageHeading } from "@/components/ui/page-heading";
import { ActivityDetectionPanel } from "@/features/activity/components";
import { GoogleCalendarSyncPanel } from "@/features/calendar/components";
import {
  ManagedFolderIndexPanel,
  ManagedFolderSyncPanel,
} from "@/features/managed-folder/components";
import { NotificationCenterPanel } from "@/features/notification/components";
import {
  DataDeletionRequestPanel,
  defaultDeletionChecks,
  defaultDeletionOptions,
  FontStrategyPanel,
  LanguagePreferencesPanel,
  LocalBackupRecoveryPanel,
  NotificationPreferencesPanel,
  PrivacyConsentPanel,
  SettingsLocalPanel,
  TauriSyncStatusPanel,
  ThemeContrastPanel,
  UserPreferencesPanel,
} from "@/features/settings/components";

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
        <TauriSyncStatusPanel />
        <ActivityDetectionPanel />
        <ManagedFolderIndexPanel />
        <ManagedFolderSyncPanel />
        <GoogleCalendarSyncPanel />
        <LocalBackupRecoveryPanel />
        <DataDeletionRequestPanel checks={defaultDeletionChecks} options={defaultDeletionOptions} />
      </div>
    </>
  );
}
