"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { authApi } from "@/features/auth/api/authApi";
import { settingsApi } from "@/features/settings/api/settingsApi";
import { ApiClientError } from "@/lib/api/errors";
import { shouldUseWorkspacePreviewData, workspacePreviewUser } from "@/lib/workspace-preview-data";
import type { AuthUser } from "@/types/api/auth";
import type { NotificationPreferencesResponse } from "@/types/api/notification";
import type { ManagedFolderResponse, PrivacyConsentsResponse, StorageUsageResponse } from "@/types/api/settings";

type SettingsData = {
  folders: ManagedFolderResponse[];
  notifications: NotificationPreferencesResponse | null;
  privacy: PrivacyConsentsResponse | null;
  storage: StorageUsageResponse | null;
};

type PageState =
  | { kind: "loading" }
  | { kind: "ready"; settings: SettingsData; user: AuthUser }
  | { kind: "auth" }
  | { kind: "offline" };

const previewSettings: SettingsData = {
  folders: [
    {
      createdAt: "2026-06-30T09:00:00.000Z",
      id: "preview-folder-1",
      localPath: "/Users/maren/Documents/Bubli",
      name: "Bubli 작업 자료",
      syncEnabled: true,
      updatedAt: "2026-06-30T09:00:00.000Z",
    },
  ],
  notifications: {
    agentEnabled: true,
    capacityEnabled: true,
    commentEnabled: true,
    messageEnabled: true,
    resourceVersionEnabled: true,
  },
  privacy: {
    activityDetectionEnabled: false,
    localFolderEnabled: true,
    personalAgentLocalMemoryEnabled: true,
    widgetUsageLocalEventEnabled: true,
  },
  storage: {
    limitBytes: 5 * 1024 * 1024 * 1024,
    usedBytes: 740 * 1024 * 1024,
  },
};

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T) {
  return result.status === "fulfilled" ? result.value : fallback;
}

function enabledCount(record: object | null) {
  if (!record) return 0;
  return Object.values(record).filter((value) => value === true).length;
}

function byteLabel(value: number) {
  if (value >= 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  }

  if (value >= 1024 * 1024) {
    return `${Math.round(value / (1024 * 1024))}MB`;
  }

  return `${Math.round(value / 1024)}KB`;
}

function storageLabel(storage: StorageUsageResponse | null) {
  if (!storage) return "사용량 확인 전";
  return `${byteLabel(storage.usedBytes)} / ${byteLabel(storage.limitBytes)}`;
}

function localeLabel(locale?: string | null) {
  if (!locale) return "한국어";
  if (locale.toLowerCase().startsWith("ko")) return "한국어";
  if (locale.toLowerCase().startsWith("en")) return "English";
  if (locale.toLowerCase().startsWith("ja")) return "日本語";
  return locale;
}

function timezoneLabel(timezone?: string | null) {
  if (!timezone) return "서울 시간";
  if (timezone === "Asia/Seoul") return "서울 시간";
  return timezone.replaceAll("_", " ");
}

export default function SettingsPage() {
  const [state, setState] = useState<PageState>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });

    if (shouldUseWorkspacePreviewData()) {
      setState({ kind: "ready", settings: previewSettings, user: workspacePreviewUser });
      return;
    }

    try {
      const user = await authApi.getMe();
      const [notifications, privacy, folders, storage] = await Promise.allSettled([
        settingsApi.getNotificationPreferences(),
        settingsApi.getPrivacyConsents(),
        settingsApi.getManagedFolders(),
        settingsApi.getStorageUsage(),
      ]);

      setState({
        kind: "ready",
        settings: {
          folders: settledValue(folders, []),
          notifications: settledValue(notifications, null),
          privacy: settledValue(privacy, null),
          storage: settledValue(storage, null),
        },
        user,
      });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setState({ kind: "auth" });
        return;
      }
      setState({ kind: "offline" });
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [load]);

  return (
    <section className="workspace-route" aria-labelledby="settings-title">
      <header className="workspace-route__header">
        <div>
          <h1 id="settings-title">설정</h1>
        </div>
      </header>

      {state.kind === "loading" && <GlassPanel className="workspace-route__panel">불러오는 중</GlassPanel>}
      {state.kind === "auth" && (
        <GlassPanel className="workspace-route__panel">
          <strong>로그인이 필요합니다</strong>
          <Link className="bubli-button bubli-button--primary" href="/login">
            로그인
          </Link>
        </GlassPanel>
      )}
      {state.kind === "offline" && (
        <GlassPanel className="workspace-route__panel">
          <strong>서버 연결 대기</strong>
          <span>저장된 값은 불러오지 못했지만, 설정 항목은 확인할 수 있습니다.</span>
          <Button onClick={() => void load()} variant="primary">
            다시 연결
          </Button>
        </GlassPanel>
      )}

      {(state.kind === "ready" || state.kind === "offline") && (
        <div className="workspace-route__cards workspace-route__cards--settings">
          <section className="workspace-route__card" aria-label="계정">
            <span className="workspace-route__label">계정</span>
            <strong>{state.kind === "ready" ? state.user.name : "연결 대기"}</strong>
            <span>{state.kind === "ready" ? state.user.email : "로그인 정보는 서버 연결 후 표시됩니다"}</span>
          </section>
          <section className="workspace-route__card" aria-label="언어">
            <span className="workspace-route__label">표시</span>
            <strong>{state.kind === "ready" ? localeLabel(state.user.locale) : "한국어"}</strong>
            <span>{state.kind === "ready" ? timezoneLabel(state.user.timezone) : "서울 시간"}</span>
          </section>
          <section className="workspace-route__card" aria-label="알림">
            <span className="workspace-route__label">알림</span>
            <strong>{state.kind === "ready" ? `${enabledCount(state.settings.notifications)}개 켜짐` : "연결 대기"}</strong>
            <span>메시지, 댓글, 자료 변경, 에이전트 후보, 용량 알림</span>
          </section>
          <section className="workspace-route__card" aria-label="개인 자료 폴더">
            <span className="workspace-route__label">개인 자료</span>
            <strong>
              {state.kind === "ready"
                ? state.settings.folders.filter((folder) => folder.syncEnabled).length > 0
                  ? `${state.settings.folders.filter((folder) => folder.syncEnabled).length}개 폴더`
                  : "앱에서 연결"
                : "앱에서 연결"}
            </strong>
            <span>{state.kind === "ready" && state.settings.folders[0] ? state.settings.folders[0].name : "개인 자료는 Tauri 앱의 로컬 폴더 동기화로 채웁니다"}</span>
          </section>
          <section className="workspace-route__card" aria-label="개인정보 동의">
            <span className="workspace-route__label">기기 권한</span>
            <strong>{state.kind === "ready" ? `${enabledCount(state.settings.privacy)}개 동의` : "연결 대기"}</strong>
            <span>동의한 범위에서만 앱 이름, 창 제목, 선택 폴더를 읽습니다</span>
          </section>
          <section className="workspace-route__card" aria-label="동기화">
            <span className="workspace-route__label">동기화</span>
            <strong>{state.kind === "ready" ? storageLabel(state.settings.storage) : "사용량 확인 전"}</strong>
            <span>최근 대화, 타이머, 위젯 기록은 앱 안 SQLite 캐시로 복구합니다</span>
          </section>
          <section className="workspace-route__card" aria-label="보안 경계">
            <span className="workspace-route__label">경계</span>
            <strong>화면·키보드 미수집</strong>
            <span>활동 감지는 작업 맥락 보조용이며 화면 내용은 읽지 않습니다</span>
          </section>
          <section className="workspace-route__card" aria-label="상태">
            <span className="workspace-route__label">상태</span>
            <strong>
              <StatusBadge tone={state.kind === "ready" ? "success" : "warning"}>{state.kind === "ready" ? "연결됨" : "연결 대기"}</StatusBadge>
            </strong>
            <span>설정 저장 API와 Tauri IPC 연결 상태를 기준으로 갱신합니다</span>
          </section>
        </div>
      )}
    </section>
  );
}
