import { ArrowRight, CheckCircle2, KeyRound, LockKeyhole, MessageCircle, PanelTop, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { siteConfig } from "@/config/site";

const loginChecks = ["구글 계정으로 로그인", "최초 로그인 시 Bubli ID 설정", "Tauri도 같은 로그인 사용"];

const previewItems = [
  { label: "프로젝트룸", value: "3개" },
  { label: "오늘 TODO", value: "8개" },
  { label: "버블", value: "켜짐" },
];

export function AuthPanel() {
  return (
    <main className="auth-page" aria-label="로그인">
      <section className="auth-page__intro">
        <Chip selected>{siteConfig.name}</Chip>
        <h1>Bubli로 돌아가기</h1>
        <p>구글 계정으로 프로젝트룸, 자료보드, WBS/작업판, 소통 화면으로 들어갑니다.</p>
        <div className="auth-page__checks">
          {loginChecks.map((check) => (
            <Chip icon={<CheckCircle2 size={14} strokeWidth={2.1} />} key={check}>
              {check}
            </Chip>
          ))}
        </div>
        <div className="auth-preview" aria-label="로그인 후 연결되는 화면">
          <div className="auth-preview__bubble auth-preview__bubble--main">
            <PanelTop size={16} strokeWidth={2.1} aria-hidden="true" />
            <strong>회원 웹 앱</strong>
            <span>/app</span>
          </div>
          <div className="auth-preview__bubble auth-preview__bubble--sub">
            <MessageCircle size={15} strokeWidth={2.1} aria-hidden="true" />
            <strong>소통 버블</strong>
            <span>채팅과 보이스 연결</span>
          </div>
          <div className="auth-preview__metrics">
            {previewItems.map((item) => (
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
            <h2>로그인</h2>
            <p>구글 계정으로 회원 웹 앱에 들어갑니다. 처음 들어온 사용자는 로그인 뒤 Bubli ID를 설정합니다.</p>
          </div>
        </div>

        <div className="auth-form" aria-label="구글 계정 로그인">
          <Button className="auth-card__submit" icon={<KeyRound size={16} />} size="lg" variant="primary">
            Google로 계속하기
          </Button>

          <div className="auth-page__checks" aria-label="인증 처리 기준">
            <Chip icon={<ShieldCheck size={14} strokeWidth={2.1} />}>구글 계정 확인</Chip>
            <Chip icon={<ArrowRight size={14} strokeWidth={2.1} />}>서버에서 세션 발급</Chip>
            <Chip icon={<LockKeyhole size={14} strokeWidth={2.1} />}>기기별 안전 저장</Chip>
          </div>
        </div>

        <p className="auth-card__helper">Bubli 계정은 Google 로그인으로 시작하고, 이메일과 비밀번호를 직접 저장하지 않습니다.</p>
      </GlassPanel>
    </main>
  );
}
