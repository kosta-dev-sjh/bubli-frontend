import {
  ArrowRight,
  Bot,
  CheckCircle2,
  FileArchive,
  FileText,
  HardDriveUpload,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

import styles from "./resource-upload-analysis-panel.module.css";

type UploadStatus = "uploading" | "analyzing" | "ready";
type UploadFile = {
  analysis: number;
  fileName: string;
  meta: string;
  scope: "개인 자료" | "프로젝트룸 자료";
  status: UploadStatus;
};

const files: UploadFile[] = [
  {
    analysis: 66,
    fileName: "번역계약서_v2.pdf",
    meta: "PDF · 2.4MB · checksum 확인",
    scope: "프로젝트룸 자료",
    status: "analyzing",
  },
  {
    analysis: 100,
    fileName: "요구사항_정리.md",
    meta: "Markdown · 84KB · resourceId 생성",
    scope: "프로젝트룸 자료",
    status: "ready",
  },
  {
    analysis: 42,
    fileName: "개인_참고메모.txt",
    meta: "TXT · 18KB · 업로드 진행 중",
    scope: "개인 자료",
    status: "uploading",
  },
];

const statusMeta: Record<UploadStatus, { label: string; tone: "todo" | "agent" | "approved" }> = {
  analyzing: { label: "분석 중", tone: "agent" },
  ready: { label: "준비됨", tone: "approved" },
  uploading: { label: "업로드 중", tone: "todo" },
};

function FileCard({ file }: { file: UploadFile }) {
  const status = statusMeta[file.status];

  return (
    <article className={styles.fileCard}>
      <div className={styles.fileTop}>
        <span className="bubli-icon-tile" aria-hidden="true">
          <FileText size={16} strokeWidth={2.1} />
        </span>
        <div>
          <div className={styles.badges}>
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            <StatusBadge tone={file.scope === "개인 자료" ? "personal" : "room"}>{file.scope}</StatusBadge>
          </div>
          <h3>{file.fileName}</h3>
          <p>{file.meta}</p>
        </div>
        <StatusBadge tone="neutral">{file.analysis}%</StatusBadge>
      </div>
      <ProgressBar label={`${file.fileName} 처리 진행률`} value={file.analysis} />
      <div className={styles.meta}>
        <span>업로드 성공 후 resourceId 기준</span>
        <span>분석 결과는 후보로 표시</span>
      </div>
    </article>
  );
}

export function ResourceUploadAnalysisPanel() {
  return (
    <section className={styles.panel} aria-label="자료 업로드와 분석 흐름">
      <GlassPanel className={styles.hero}>
        <div>
          <Chip icon={<HardDriveUpload size={14} />} selected>
            자료 업로드
          </Chip>
          <h2>자료를 올리면 저장, 권한 확인, 분석 후보 생성까지 같은 흐름으로 이어집니다</h2>
          <p>
            업로드는 Spring Boot multipart 중계 방식을 기준으로 시작합니다. 성공하면 resourceId를 만들고,
            에이전트 분석은 job 상태와 후보 목록으로 이어집니다.
          </p>
        </div>
        <div className={styles.summary}>
          <StatusBadge tone="todo">multipart</StatusBadge>
          <strong>100MB</strong>
          <span>단일 파일 기준</span>
          <ProgressBar label="업로드 준비 기준 반영률" value={81} />
        </div>
      </GlassPanel>

      <div className={styles.flow}>
        <span>파일 선택</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>MIME/크기 확인</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>resourceId 생성</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>agent_jobs 분석</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>후보 확인</span>
      </div>

      <div className={styles.grid}>
        <GlassPanel className={styles.uploadCard}>
          <div className={styles.dropzone}>
            <div className={styles.dropzoneInner}>
              <span className="bubli-icon-tile" aria-hidden="true">
                <UploadCloud size={18} strokeWidth={2.1} />
              </span>
              <h3>계약서, 요구사항, 회의록, 참고자료를 올립니다</h3>
              <p>PDF, DOCX, PPTX, XLSX, TXT, MD, CSV, PNG, JPG, JPEG, WEBP를 우선 지원합니다.</p>
              <div className={styles.chips}>
                <Chip>개인 자료</Chip>
                <Chip>프로젝트룸 자료</Chip>
                <Chip>진행률 표시</Chip>
              </div>
            </div>
          </div>

          <div className={styles.sectionTitle}>
            <h3>업로드 상태</h3>
            <p>자료 원본과 분석 결과는 분리해서 보여줍니다.</p>
          </div>
          <div className={styles.fileList}>
            {files.map((file) => (
              <FileCard file={file} key={file.fileName} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className={styles.rules}>
          <h3>저장과 분석 기준</h3>
          <div className={styles.ruleList}>
            <article className={styles.ruleCard}>
              <code>권한 확인</code>
              <h4>자료 범위 먼저 확인</h4>
              <p>개인 자료와 프로젝트룸 자료는 visibility와 room 권한으로 나눕니다.</p>
            </article>
            <article className={styles.ruleCard}>
              <code>S3</code>
              <h4>공개 URL로 열지 않음</h4>
              <p>다운로드는 서버 권한 확인 뒤 발급된 URL로만 처리합니다.</p>
            </article>
            <article className={styles.ruleCard}>
              <code>checksum</code>
              <h4>중복 분석 방지</h4>
              <p>같은 파일 반복 업로드는 checksum 기준으로 분석 요청을 줄입니다.</p>
            </article>
            <article className={styles.ruleCard}>
              <code>agent_jobs</code>
              <h4>분석 결과는 후보</h4>
              <p>요약, 확인 필요 항목, WBS/TODO는 사용자가 확인하기 전까지 후보로 둡니다.</p>
            </article>
          </div>
          <div className={styles.chips}>
            <Chip icon={<ShieldCheck size={14} />}>프롬프트 인젝션 방어</Chip>
            <Chip icon={<LockKeyhole size={14} />}>S3 public 금지</Chip>
            <Chip icon={<Bot size={14} />}>후보 생성</Chip>
            <Chip icon={<RefreshCw size={14} />}>상태 이벤트</Chip>
            <Chip icon={<FileArchive size={14} />}>버전 기록</Chip>
            <Chip icon={<CheckCircle2 size={14} />}>사용자 확인</Chip>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
