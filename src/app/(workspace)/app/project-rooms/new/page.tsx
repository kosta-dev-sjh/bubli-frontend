"use client";

import { AlertCircle, ArrowLeft, CheckCircle2, FileText, Loader2, Sparkles, UploadCloud, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { agentApi } from "@/features/agent/api/agentApi";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { ApiClientError } from "@/lib/api/errors";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import type { ProjectRoomUpsertRequest } from "@/types/api/projectRoom";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type SubmitState = "idle" | "submitting" | "auth" | "error";

type RoomDraft = {
  clientName: string;
  contractAmount: string;
  deliveryScope: string;
  name: string;
  paymentDueDate: string;
  reviewQuestion: string;
};

const emptyDraft: RoomDraft = {
  clientName: "",
  contractAmount: "",
  deliveryScope: "",
  name: "",
  paymentDueDate: "",
  reviewQuestion: "",
};

const documentSlots = [
  { labelKey: "room.new.slot.contract", targetKey: "room.new.slot.contractTarget" },
  { labelKey: "room.new.slot.requirement", targetKey: "room.new.slot.requirementTarget" },
  { labelKey: "room.new.slot.minutes", targetKey: "room.new.slot.minutesTarget" },
] as const satisfies ReadonlyArray<{ labelKey: MessageKey; targetKey: MessageKey }>;

function nullableText(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function nullableAmount(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.replaceAll(",", "").trim() : "";
  if (!text) return null;

  const amount = Number(text);
  return Number.isFinite(amount) ? amount : null;
}

export default function NewProjectRoomPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [draft, setDraft] = useState<RoomDraft>(emptyDraft);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const attachedNames = useMemo(() => attachedFiles.map((file) => file.name).join(", "), [attachedFiles]);
  const candidateState = attachedFiles.length > 0 ? "ready" : "waiting";

  function updateDraft(key: keyof RoomDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setAttachedFiles(files);
    setMessage(null);

    if (files.length === 0) return;

    const firstName = files[0]?.name.replace(/\.[^.]+$/, "").replaceAll("_", " ").trim() ?? "";
    setDraft((current) => ({
      ...current,
      name: current.name || firstName,
      deliveryScope: current.deliveryScope || t("room.new.autofillScope"),
      reviewQuestion: current.reviewQuestion || t("room.new.autofillReview"),
    }));
  }

  function removeAttachedFile(fileName: string) {
    setAttachedFiles((files) => files.filter((file) => file.name !== fileName));
  }

  async function uploadRoomFiles(roomId: string, files: File[]) {
    await Promise.all(
      files.map((file) => {
        const body = new FormData();
        body.append("title", file.name);
        body.append("kind", "FILE");
        body.append("visibility", "ROOM_SHARED");
        body.append("roomId", roomId);
        body.append("file", file);

        return resourcesApi.upload(body);
      }),
    );

    await agentApi.reviewContractDocuments({ roomId });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = draft.name.trim();

    if (!name) {
      setSubmitState("error");
      setMessage(t("room.new.errorNameRequired"));
      return;
    }

    const contractAmount = nullableAmount(formData.get("contractAmount"));
    const paymentDueDate = nullableText(formData.get("paymentDueDate"));
    const body: ProjectRoomUpsertRequest = {
      clientName: nullableText(formData.get("clientName")),
      contractAmount,
      name,
      paymentDueDate,
      paymentStatus: contractAmount || paymentDueDate ? "PENDING" : "NOT_RECORDED",
    };

    setSubmitState("submitting");
    setMessage(null);

    try {
      const room = await projectRoomApi.create(body);
      if (attachedFiles.length > 0) {
        try {
          await uploadRoomFiles(room.id, attachedFiles);
        } catch {
          // 프로젝트룸 생성은 유지하고, 자료 업로드/분석은 룸 자료보드에서 다시 이어갈 수 있게 한다.
        }
      }
      router.push(`/app/project-rooms/${room.id}`);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setSubmitState("auth");
        setMessage(t("room.new.errorAuth"));
        return;
      }

      setSubmitState("error");
      setMessage(error instanceof Error && error.message !== "Failed to fetch" ? error.message : t("room.new.errorCreateFailed"));
    }
  }

  return (
    <section className="workspace-route workspace-route--room-form" aria-labelledby="new-room-title">
      <header className="workspace-route__header">
        <div>
          <h1 id="new-room-title">{t("room.new.title")}</h1>
        </div>
        <Link className="bubli-button" href="/app/project-rooms">
          <ArrowLeft aria-hidden size={15} strokeWidth={1.9} />
          {t("room.new.list")}
        </Link>
      </header>

      <GlassPanel className="workspace-route__section">
        <form className="workspace-route__form" onSubmit={handleSubmit}>
          <div className="workspace-route__upload-card">
            <input
              ref={fileInputRef}
              className="workspace-route__file-input"
              multiple
              name="roomFiles"
              onChange={handleFilesChange}
              type="file"
            />
            <button className="workspace-route__upload-button" onClick={() => fileInputRef.current?.click()} type="button">
              <span className="workspace-route__upload-icon" aria-hidden="true">
                {attachedFiles.length > 0 ? <FileText size={20} strokeWidth={2} /> : <UploadCloud size={21} strokeWidth={2} />}
              </span>
              <span>
                <strong>{attachedFiles.length > 0 ? t("room.new.attachedCount", { count: attachedFiles.length }) : t("room.new.attachPrompt")}</strong>
                <small>
                  {attachedFiles.length > 0
                    ? t("room.new.attachedHint")
                    : t("room.new.attachHint")}
                </small>
              </span>
            </button>
            {attachedFiles.length > 0 ? (
              <button className="workspace-route__upload-clear" onClick={() => setAttachedFiles([])} type="button" aria-label={t("room.new.clearAttachments")}>
                <X size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          {attachedFiles.length > 0 ? (
            <div className="workspace-route__summary" aria-label={t("room.new.attachmentsLabel")}>
              {attachedFiles.map((file) => (
                <span key={file.name}>
                  {file.name}
                  <button
                    aria-label={t("room.new.removeFile", { name: file.name })}
                    onClick={() => removeAttachedFile(file.name)}
                    style={{ border: 0, background: "transparent", color: "inherit", cursor: "pointer", font: "inherit", marginLeft: 8, padding: 0 }}
                    type="button"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <div className="workspace-route__split">
            <div className="workspace-route__section">
              <div className="workspace-route__section-head">
                <div>
                  <strong>{t("room.new.userSection")}</strong>
                  <span>{t("room.new.userSectionSub")}</span>
                </div>
              </div>

              <label className="workspace-route__field">
                <span>{t("room.new.nameLabel")}</span>
                <input
                  autoComplete="off"
                  maxLength={120}
                  name="name"
                  onChange={(event) => updateDraft("name", event.target.value)}
                  placeholder={t("room.new.namePlaceholder")}
                  required
                  value={draft.name}
                />
              </label>

              <label className="workspace-route__field">
                <span>{t("room.new.clientLabel")}</span>
                <input
                  autoComplete="organization"
                  maxLength={120}
                  name="clientName"
                  onChange={(event) => updateDraft("clientName", event.target.value)}
                  placeholder={t("room.new.clientPlaceholder")}
                  value={draft.clientName}
                />
              </label>

              <div className="workspace-route__field-grid">
                <label className="workspace-route__field">
                  <span>{t("room.new.amountLabel")}</span>
                  <input
                    inputMode="numeric"
                    name="contractAmount"
                    onChange={(event) => updateDraft("contractAmount", event.target.value)}
                    placeholder={t("room.new.amountPlaceholder")}
                    value={draft.contractAmount}
                  />
                </label>

                <label className="workspace-route__field">
                  <span>{t("room.new.dueLabel")}</span>
                  <input name="paymentDueDate" onChange={(event) => updateDraft("paymentDueDate", event.target.value)} type="date" value={draft.paymentDueDate} />
                </label>
              </div>
            </div>

            <div className="workspace-route__section">
              <div className="workspace-route__section-head">
                <div>
                  <strong>{t("room.new.agentSection")}</strong>
                  <span>{candidateState === "ready" ? attachedNames : t("room.new.agentSectionEmpty")}</span>
                </div>
                <Sparkles aria-hidden size={17} strokeWidth={2} />
              </div>

              <div className="workspace-route__list" aria-live="polite">
                {documentSlots.map((slot, index) => (
                  <article
                    className="workspace-route__row"
                    key={slot.labelKey}
                    style={{
                      opacity: candidateState === "ready" ? 1 : 0.72,
                      transform: candidateState === "ready" ? "translateY(0)" : "translateY(2px)",
                      transition: `opacity 220ms ease ${index * 70}ms, transform 220ms ease ${index * 70}ms`,
                    }}
                  >
                    <span className="workspace-route__dot" aria-hidden="true" />
                    <span className="workspace-route__main">
                      <strong>{t(slot.labelKey)}</strong>
                      <span>{t(slot.targetKey)}</span>
                    </span>
                    <span className="workspace-route__status">{candidateState === "ready" ? t("room.new.candidateReady") : t("room.new.candidateWaiting")}</span>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <details className="workspace-route__details">
            <summary>{t("room.new.wbsDetails")}</summary>
            <div className="workspace-route__field-grid">
              <label className="workspace-route__field">
                <span>{t("room.new.scopeLabel")}</span>
                <input
                  maxLength={160}
                  name="deliveryScope"
                  onChange={(event) => updateDraft("deliveryScope", event.target.value)}
                  placeholder={t("room.new.scopePlaceholder")}
                  value={draft.deliveryScope}
                />
              </label>

              <label className="workspace-route__field">
                <span>{t("room.new.reviewLabel")}</span>
                <input
                  maxLength={160}
                  name="reviewQuestion"
                  onChange={(event) => updateDraft("reviewQuestion", event.target.value)}
                  placeholder={t("room.new.reviewPlaceholder")}
                  value={draft.reviewQuestion}
                />
              </label>
            </div>
          </details>

          <div className="workspace-route__summary" aria-label={t("room.new.flowLabel")}>
            <span>{t("room.new.flowSave")}</span>
            <span>{t("room.new.flowCandidates")}</span>
            <span>{t("room.new.flowConfirm")}</span>
            <span>{t("room.new.flowConnect")}</span>
          </div>

          {message ? (
            <p className="workspace-route__form-message" role={submitState === "error" || submitState === "auth" ? "alert" : undefined}>
              <AlertCircle aria-hidden size={16} strokeWidth={2} />
              {message}
            </p>
          ) : null}

          <div className="workspace-route__actions workspace-route__actions--start">
            <Button loading={submitState === "submitting"} type="submit" variant="primary">
              {submitState === "submitting" ? <Loader2 aria-hidden size={15} strokeWidth={2} /> : null}
              <CheckCircle2 aria-hidden size={15} strokeWidth={2} />
              {t("room.new.submit")}
            </Button>
            {submitState === "auth" ? (
              <Link className="bubli-button" href="/login">
                {t("room.new.login")}
              </Link>
            ) : null}
          </div>
        </form>
      </GlassPanel>
    </section>
  );
}
