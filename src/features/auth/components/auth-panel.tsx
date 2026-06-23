import Link from "next/link";
import { ArrowRight, CheckCircle2, LockKeyhole, Mail, MessageCircle, PanelTop, UserRound } from "lucide-react";

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
    description: "프로젝트룸, 자료보드, WBS/작업판, 소통 화면으로 들어갑니다.",
    helper: "아직 계정이 없다면",
    helperHref: "/signup",
    helperLabel: "회원가입",
    title: "다시 Bubli로 들어가기",
  },
  signup: {
    action: "회원가입",
    description: "Bubli ID를 만들고 친구 요청과 프로젝트룸 초대를 받을 준비를 합니다.",
    helper: "이미 계정이 있다면",
    helperHref: "/login",
    helperLabel: "로그인",
    title: "Bubli 시작하기",
  },
} satisfies Record<AuthMode, Record<string, string>>;

const loginChecks = ["회원 웹 앱은 로그인 후 사용", "LiveKit 토큰은 서버에서 발급", "Tauri도 같은 API 경계 사용"];
const signupChecks = ["Bubli ID로 친구 검색", "친구 수락 후 1:1 채팅", "프로젝트룸 초대 수락 가능"];

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
            <p>{mode === "login" ? "이메일과 비밀번호로 회원 웹 앱에 들어갑니다." : "Bubli ID와 이메일로 계정을 만듭니다."}</p>
          </div>
        </div>

        <form className="auth-form">
          {mode === "signup" ? (
            <label className="auth-field">
              <span>Bubli ID</span>
              <div className="auth-input">
                <UserRound aria-hidden="true" size={17} strokeWidth={2.1} />
                <input placeholder="bubli-id" type="text" />
              </div>
            </label>
          ) : null}

          <label className="auth-field">
            <span>이메일</span>
            <div className="auth-input">
              <Mail aria-hidden="true" size={17} strokeWidth={2.1} />
              <input autoComplete="email" placeholder="name@example.com" type="email" />
            </div>
          </label>

          <label className="auth-field">
            <span>비밀번호</span>
            <div className="auth-input">
              <LockKeyhole aria-hidden="true" size={17} strokeWidth={2.1} />
              <input autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="8자 이상" type="password" />
            </div>
          </label>

          {mode === "signup" ? (
            <label className="auth-field">
              <span>비밀번호 확인</span>
              <div className="auth-input">
                <LockKeyhole aria-hidden="true" size={17} strokeWidth={2.1} />
                <input autoComplete="new-password" placeholder="한 번 더 입력" type="password" />
              </div>
            </label>
          ) : null}

          <Button className="auth-card__submit" icon={<ArrowRight size={16} />} size="lg" variant="primary">
            {copy.action}
          </Button>
        </form>

        <p className="auth-card__helper">
          {copy.helper} <Link href={copy.helperHref}>{copy.helperLabel}</Link>
        </p>
      </GlassPanel>
    </main>
  );
}
