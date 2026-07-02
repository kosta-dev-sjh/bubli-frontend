"use client";

import { CheckCircle2, FolderOpen, HardDrive, Loader2, RefreshCw, ShieldCheck, UploadCloud, X } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  enablePersonalFolderSync,
  scanPersonalManagedFolder,
  selectPersonalManagedFolder,
  syncPersonalLocalFileEventsToServer,
} from "@/lib/local/managed-folder-client";

type FolderState = {
  localFolderId: string;
  name: string;
  path: string;
  syncEnabled: boolean;
};

type SyncStatus = "idle" | "scanning" | "syncing" | "done" | "error";

type SyncLog = {
  count: number;
  at: string;
  status: "success" | "error";
  message?: string;
};

function FolderPermissionDialog({
  folderName,
  onAllow,
  onDeny,
}: {
  folderName: string;
  onAllow: () => void;
  onDeny: () => void;
}) {
  return (
    <div className="managed-folder-permission-overlay">
      <div className="managed-folder-permission-dialog" role="dialog" aria-modal="true">
        <span className="bubli-icon-tile managed-folder-permission-dialog__icon" aria-hidden="true">
          <ShieldCheck size={24} strokeWidth={2} />
        </span>
        <h2 className="managed-folder-permission-dialog__title">폴더 자동 동기화 허가</h2>
        <p className="managed-folder-permission-dialog__desc">
          <strong>{folderName}</strong> 폴더의 파일 변경을 자동으로 서버에 반영합니다.
          <br />
          허가하면 이후 변경 사항은 별도 승인 없이 자동으로 동기화됩니다.
        </p>
        <div className="managed-folder-permission-dialog__actions">
          <Button variant="quiet" size="sm" icon={<X size={14} />} onClick={onDeny}>
            거절
          </Button>
          <Button variant="primary" size="sm" icon={<CheckCircle2 size={14} />} onClick={onAllow}>
            허가
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ManagedFolderSyncPanel() {
  const [folder, setFolder] = useState<FolderState | null>(null);
  const [showPermission, setShowPermission] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncLog, setSyncLog] = useState<SyncLog | null>(null);

  const handleSelectFolder = useCallback(async () => {
    const result = await selectPersonalManagedFolder();
    if (result.status !== "ready") return;

    const { localFolderId, name, path } = result.data;
    setFolder({ localFolderId, name, path, syncEnabled: false });
    setShowPermission(true);
  }, []);

  const runAutoSync = useCallback(async (localFolderId: string) => {
    setSyncStatus("scanning");

    const scanResult = await scanPersonalManagedFolder({ localFolderId });
    if (scanResult.status !== "ready") {
      setSyncStatus("error");
      setSyncLog({ count: 0, at: new Date().toLocaleTimeString(), status: "error", message: "스캔 실패" });
      return;
    }

    if (scanResult.data.changedCount === 0) {
      setSyncStatus("done");
      setSyncLog({ count: 0, at: new Date().toLocaleTimeString(), status: "success" });
      return;
    }

    setSyncStatus("syncing");

    const syncResult = await syncPersonalLocalFileEventsToServer({ localFolderId });
    if (syncResult.status !== "ready") {
      setSyncStatus("error");
      setSyncLog({
        count: 0,
        at: new Date().toLocaleTimeString(),
        status: "error",
        message: syncResult.status === "failed" ? syncResult.message : "동기화 실패",
      });
      return;
    }

    setSyncLog({
      count: syncResult.data.syncedCount,
      at: new Date().toLocaleTimeString(),
      status: "success",
    });
    setSyncStatus("done");
  }, []);

  const handleAllowSync = useCallback(async () => {
    if (!folder) return;
    setShowPermission(false);

    await enablePersonalFolderSync(folder.localFolderId);
    setFolder((prev) => prev && { ...prev, syncEnabled: true });

    await runAutoSync(folder.localFolderId);
  }, [folder, runAutoSync]);

  const handleDenySync = useCallback(() => {
    setShowPermission(false);
    setFolder(null);
  }, []);

  const handleRescan = useCallback(() => {
    if (!folder?.syncEnabled) return;
    runAutoSync(folder.localFolderId);
  }, [folder, runAutoSync]);

  const isRunning = syncStatus === "scanning" || syncStatus === "syncing";

  return (
    <section className="managed-folder-sync" aria-label="개인 관리 폴더 동기화">
      {showPermission && folder && (
        <FolderPermissionDialog
          folderName={folder.name}
          onAllow={handleAllowSync}
          onDeny={handleDenySync}
        />
      )}

      <GlassPanel className="managed-folder-sync__hero">
        <div className="managed-folder-sync__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <FolderOpen size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>개인 관리 폴더</Chip>
            <h2>한 번 허가하면 폴더 변경이 자동으로 서버에 반영됩니다</h2>
            <p>폴더를 선택하고 최초 허가하면 이후 모든 변경은 자동으로 동기화됩니다.</p>
          </div>
        </div>

        {folder ? (
          <div className="managed-folder-sync__folder-info">
            <Chip icon={<FolderOpen size={13} />}>{folder.name}</Chip>
            {folder.syncEnabled ? (
              <StatusBadge tone="success">자동 동기화 활성</StatusBadge>
            ) : (
              <StatusBadge tone="pending">허가 대기</StatusBadge>
            )}
          </div>
        ) : (
          <Button icon={<FolderOpen size={15} />} size="sm" variant="primary" onClick={handleSelectFolder}>
            폴더 선택
          </Button>
        )}
      </GlassPanel>

      <div className="managed-folder-sync__grid">
        <GlassPanel className="managed-folder-sync__panel">
          <div className="managed-folder-sync__toolbar">
            <h3>동기화 상태</h3>
            {folder?.syncEnabled && (
              <Button
                icon={isRunning ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                size="sm"
                variant="quiet"
                onClick={handleRescan}
                disabled={isRunning}
              >
                {syncStatus === "scanning" ? "스캔 중..." : syncStatus === "syncing" ? "전송 중..." : "다시 스캔"}
              </Button>
            )}
          </div>

          {syncLog && (
            <div className={`managed-folder-sync__log ${syncLog.status === "error" ? "managed-folder-sync__log--error" : ""}`}>
              <CheckCircle2 size={14} />
              <span>
                {syncLog.status === "success"
                  ? syncLog.count > 0
                    ? `${syncLog.count}개 파일 동기화 완료 · ${syncLog.at}`
                    : `변경된 파일 없음 · ${syncLog.at}`
                  : `동기화 실패: ${syncLog.message} · ${syncLog.at}`}
              </span>
            </div>
          )}

          {!folder ? (
            <p className="managed-folder-sync__empty">폴더를 선택하면 자동으로 동기화가 시작됩니다.</p>
          ) : isRunning ? (
            <p className="managed-folder-sync__empty">
              {syncStatus === "scanning" ? "폴더를 스캔하고 있습니다..." : "서버에 변경 사항을 전송 중입니다..."}
            </p>
          ) : null}
        </GlassPanel>

        <GlassPanel className="managed-folder-sync__policy">
          <h3>저장과 권한 기준</h3>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <HardDrive size={16} strokeWidth={2.1} />
            </span>
            <p>파일 변경 감지와 색인 상태는 기기 안 임시 저장소에 먼저 저장합니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <ShieldCheck size={16} strokeWidth={2.1} />
            </span>
            <p>폴더 허가는 처음 한 번만 확인합니다. 이후 변경은 자동으로 반영됩니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <UploadCloud size={16} strokeWidth={2.1} />
            </span>
            <p>전송 실패 작업은 대기 목록에 남기고 같은 작업이 두 번 반영되지 않게 재시도합니다.</p>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
