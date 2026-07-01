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
import type { ProjectRoomUpsertRequest } from "@/types/api/projectRoom";

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
  { label: "계약서", target: "프로젝트룸 참고 정보" },
  { label: "요구사항", target: "WBS/TODO 후보" },
  { label: "회의록", target: "확인 질문" },
] as const;

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
      deliveryScope: current.deliveryScope || "자료에서 납품물과 작업 범위를 확인",
      reviewQuestion: current.reviewQuestion || "검수 기준과 수정 범위를 확인",
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
      setMessage("프로젝트룸 이름을 입력하세요.");
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
        setMessage("로그인이 필요합니다.");
        return;
      }

      setSubmitState("error");
      setMessage(error instanceof Error && error.message !== "Failed to fetch" ? error.message : "프로젝트룸을 만들지 못했습니다.");
    }
  }

  return (
    <section className="workspace-route workspace-route--room-form" aria-labelledby="new-room-title">
      <header className="workspace-route__header">
        <div>
          <h1 id="new-room-title">프로젝트룸 만들기</h1>
        </div>
        <Link className="bubli-button" href="/app/project-rooms">
          <ArrowLeft aria-hidden size={15} strokeWidth={1.9} />
          목록
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
                <strong>{attachedFiles.length > 0 ? `${attachedFiles.length}개 자료 첨부` : "계약서, 요구사항, 회의록 첨부"}</strong>
                <small>
                  {attachedFiles.length > 0
                    ? "생성 후 프로젝트룸 자료로 올리고 에이전트 후보를 만듭니다."
                    : "자료를 올리면 이름, 의뢰처, 납품물, 확인 질문 후보를 같은 흐름에서 검토합니다."}
                </small>
              </span>
            </button>
            {attachedFiles.length > 0 ? (
              <button className="workspace-route__upload-clear" onClick={() => setAttachedFiles([])} type="button" aria-label="첨부 모두 제거">
                <X size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          {attachedFiles.length > 0 ? (
            <div className="workspace-route__summary" aria-label="첨부 자료">
              {attachedFiles.map((file) => (
                <span key={file.name}>
                  {file.name}
                  <button
                    aria-label={`${file.name} 제거`}
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
                  <strong>사용자가 확인할 값</strong>
                  <span>후보로 채워져도 직접 고칠 수 있습니다</span>
                </div>
              </div>

              <label className="workspace-route__field">
                <span>프로젝트룸 이름</span>
                <input
                  autoComplete="off"
                  maxLength={120}
                  name="name"
                  onChange={(event) => updateDraft("name", event.target.value)}
                  placeholder="자료에서 후보로 채워질 이름"
                  required
                  value={draft.name}
                />
              </label>

              <label className="workspace-route__field">
                <span>의뢰처</span>
                <input
                  autoComplete="organization"
                  maxLength={120}
                  name="clientName"
                  onChange={(event) => updateDraft("clientName", event.target.value)}
                  placeholder="계약서에서 확인한 의뢰처"
                  value={draft.clientName}
                />
              </label>

              <div className="workspace-route__field-grid">
                <label className="workspace-route__field">
                  <span>계약 금액</span>
                  <input
                    inputMode="numeric"
                    name="contractAmount"
                    onChange={(event) => updateDraft("contractAmount", event.target.value)}
                    placeholder="필요할 때만 입력"
                    value={draft.contractAmount}
                  />
                </label>

                <label className="workspace-route__field">
                  <span>납품일 또는 입금 예정일</span>
                  <input name="paymentDueDate" onChange={(event) => updateDraft("paymentDueDate", event.target.value)} type="date" value={draft.paymentDueDate} />
                </label>
              </div>
            </div>

            <div className="workspace-route__section">
              <div className="workspace-route__section-head">
                <div>
                  <strong>에이전트 추출 후보</strong>
                  <span>{candidateState === "ready" ? attachedNames : "자료를 첨부하면 후보가 나타납니다"}</span>
                </div>
                <Sparkles aria-hidden size={17} strokeWidth={2} />
              </div>

              <div className="workspace-route__list" aria-live="polite">
                {documentSlots.map((slot, index) => (
                  <article
                    className="workspace-route__row"
                    key={slot.label}
                    style={{
                      opacity: candidateState === "ready" ? 1 : 0.72,
                      transform: candidateState === "ready" ? "translateY(0)" : "translateY(2px)",
                      transition: `opacity 220ms ease ${index * 70}ms, transform 220ms ease ${index * 70}ms`,
                    }}
                  >
                    <span className="workspace-route__dot" aria-hidden="true" />
                    <span className="workspace-route__main">
                      <strong>{slot.label}</strong>
                      <span>{slot.target}</span>
                    </span>
                    <span className="workspace-route__status">{candidateState === "ready" ? "후보 준비" : "대기"}</span>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <details className="workspace-route__details">
            <summary>WBS와 TODO로 이어질 후보</summary>
            <div className="workspace-route__field-grid">
              <label className="workspace-route__field">
                <span>작업 범위 후보</span>
                <input
                  maxLength={160}
                  name="deliveryScope"
                  onChange={(event) => updateDraft("deliveryScope", event.target.value)}
                  placeholder="예: 상품 상세 120건 번역"
                  value={draft.deliveryScope}
                />
              </label>

              <label className="workspace-route__field">
                <span>확인 질문 후보</span>
                <input
                  maxLength={160}
                  name="reviewQuestion"
                  onChange={(event) => updateDraft("reviewQuestion", event.target.value)}
                  placeholder="예: 검수 기준과 수정 횟수 확인"
                  value={draft.reviewQuestion}
                />
              </label>
            </div>
          </details>

          <div className="workspace-route__summary" aria-label="생성 후 흐름">
            <span>프로젝트룸 자료로 저장</span>
            <span>에이전트 후보 생성</span>
            <span>사용자 확인</span>
            <span>WBS/TODO/일정으로 연결</span>
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
              후보 확인하고 만들기
            </Button>
            {submitState === "auth" ? (
              <Link className="bubli-button" href="/login">
                로그인
              </Link>
            ) : null}
          </div>
        </form>
      </GlassPanel>
    </section>
  );
}
