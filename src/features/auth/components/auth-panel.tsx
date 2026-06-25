import Link from "next/link";
import { ArrowRight, CheckCircle2, KeyRound, LockKeyhole, MessageCircle, PanelTop, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { siteConfig } from "@/config/site";

type AuthMode = "login" | "signup";

type AuthPanelProps = {
  mode: AuthMode;
};

const modeCopy = {
  login: {
    action: "로그인",
    description: "구글 계정으로 프로젝트룸, 자료보드, WBS/작업판, 소통 화면으로 들어갑니다.",
    helper: "아직 계정이 없다면",
    helperHref: "/signup",
    helperLabel: "구글로 시작하기",
    title: "다시 Bubli로 들어가기",
  },
  signup: {
    action: "시작하기",
    description: "구글 로그인 후 Bubli ID를 설정하고 친구 요청과 프로젝트룸 초대를 받을 준비를 합니다.",
    helper: "이미 계정이 있다면",
    helperHref: "/login",
    helperLabel: "로그인",
    title: "Bubli 시작하기",
  },
} satisfies Record<AuthMode, Record<string, string>>;

const loginChecks = ["구글 OAuth로 로그인", "LiveKit 토큰은 서버에서 발급", "Tauri도 같은 인증 API 사용"];
const signupChecks = ["최초 로그인 시 사용자 생성", "Bubli ID로 친구 검색", "프로젝트룸 초대 수락 가능"];

const previewItems = {
  login: [
    { label: "프로젝트룸", value: "3개" },
    { label: "오늘 TODO", value: "8개" },
    { label: "버블", value: "켜짐" },
  ],
  signup: [
    { label: "Bubli ID", value: "생성" },
    { label: "친구", value: "대기" },
    { label: "초대", value: "수락" },
  ],
} satisfies Record<AuthMode, Array<{ label: string; value: string }>>;

export function AuthPanel({ mode }: AuthPanelProps) {
  const copy = modeCopy[mode];
  const checks = mode === "login" ? loginChecks : signupChecks;

  return (
    <main className="auth-page" aria-label={copy.action}>
      <section className="auth-page__intro">
        <Chip selected>{siteConfig.name}</Chip>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
        <div className="auth-page__checks">
          {checks.map((check) => (
            <Chip icon={<CheckCircle2 size={14} strokeWidth={2.1} />} key={check}>
              {check}
            </Chip>
          ))}
        </div>
        <div className="auth-preview" aria-label="로그인 후 연결되는 화면">
          <div className="auth-preview__bubble auth-preview__bubble--main">
            <PanelTop size={16} strokeWidth={2.1} aria-hidden="true" />
            <strong>{mode === "login" ? "회원 웹 앱" : "Bubli ID"}</strong>
            <span>{mode === "login" ? "/app" : "친구와 프로젝트룸 초대 기준"}</span>
          </div>
          <div className="auth-preview__bubble auth-preview__bubble--sub">
            <MessageCircle size={15} strokeWidth={2.1} aria-hidden="true" />
            <strong>{mode === "login" ? "소통 버블" : "친구 요청"}</strong>
            <span>{mode === "login" ? "채팅과 보이스 연결" : "ID 검색 후 수락"}</span>
          </div>
          <div className="auth-preview__metrics">
            {previewItems[mode].map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <GlassPanel as="section" className="auth-card">
        <div className="auth-card__head">
          <span className="bubli-icon-tile" aria-hidden="true">
            <LockKeyhole size={18} strokeWidth={2.1} />
          </span>
          <div>
            <h2>{copy.action}</h2>
            <p>
              {mode === "login"
                ? "구글 OAuth로 회원 웹 앱에 들어갑니다."
                : "구글 로그인 뒤 Bubli ID와 기본 프로필을 설정합니다."}
            </p>
          </div>
        </div>

        <div className="auth-form" aria-label="구글 OAuth 로그인">
          <Button className="auth-card__submit" icon={<KeyRound size={16} />} size="lg" variant="primary">
            Google로 계속하기
          </Button>

          <div className="auth-page__checks" aria-label="인증 처리 기준">
            <Chip icon={<ShieldCheck size={14} strokeWidth={2.1} />}>구글 계정 확인</Chip>
            <Chip icon={<ArrowRight size={14} strokeWidth={2.1} />}>서버 token 발급</Chip>
            <Chip icon={<LockKeyhole size={14} strokeWidth={2.1} />}>refresh token 안전 저장</Chip>
          </div>
        </div>

        <p className="auth-card__helper">
          {copy.helper} <Link href={copy.helperHref}>{copy.helperLabel}</Link>
        </p>
      </GlassPanel>
    </main>
  );
}
