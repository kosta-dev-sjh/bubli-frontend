import { PageHeading } from "@/components/ui/page-heading";
import {
  DataDeletionRequestPanel,
  defaultDeletionChecks,
  defaultDeletionOptions,
  LocalBackupRecoveryPanel,
  LocalSyncOutboxPanel,
  NotificationPreferencesPanel,
  PrivacyConsentPanel,
  SettingsLocalPanel,
  TauriSyncStatusPanel,
} from "@/features/settings/components";

export default function SettingsPage() {
  return (
    <>
      <PageHeading
        title="설정"
        description="사용자별 알림, 개인정보 동의, Tauri 로컬 저장, 백업과 삭제 요청을 한 흐름으로 확인합니다."
      />
      <div className="page-grid">
        <SettingsLocalPanel />
        <PrivacyConsentPanel />
        <NotificationPreferencesPanel />
        <TauriSyncStatusPanel />
        <LocalSyncOutboxPanel />
        <LocalBackupRecoveryPanel />
        <DataDeletionRequestPanel checks={defaultDeletionChecks} options={defaultDeletionOptions} />
      </div>
    </>
  );
}
