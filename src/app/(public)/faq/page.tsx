import { AppWindow, Database, FolderLock, MessageCircle, ShieldCheck } from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PageHeading } from "@/components/ui/page-heading";

const faqItems = [
  {
    answer: "웹은 프로젝트룸, 자료보드, 작업판, 소통 같은 기본 업무 화면입니다. Tauri 앱은 같은 회원 웹 앱을 열고 버블, 로컬 폴더, SQLite 캐시, 타이머 복구 같은 데스크탑 기능을 더합니다.",
    icon: AppWindow,
    question: "웹과 Tauri 앱은 무엇이 다른가요?",
  },
  {
    answer: "개인 자료는 사용자가 공유하기 전까지 프로젝트룸에 보이지 않습니다. 프로젝트룸 자료는 멤버 권한을 확인한 뒤 같은 공간에서 함께 봅니다.",
    icon: FolderLock,
    question: "개인 자료와 프로젝트룸 자료는 어떻게 나뉘나요?",
  },
  {
    answer: "에이전트 결과는 확정 데이터가 아니라 후보입니다. 사용자가 확인한 값만 WBS, TODO, 일정, 자료 상태에 반영됩니다.",
    icon: ShieldCheck,
    question: "에이전트가 자동으로 작업을 확정하나요?",
  },
  {
    answer: "회원 웹 앱에서는 소통 탭에서 채팅과 보이스를 사용합니다. Tauri 앱에서는 메인 탭을 숨기고 소통 버블이나 전용 창에서 같은 서버 연결과 보이스 연결을 씁니다.",
    icon: MessageCircle,
    question: "앱에서는 채팅과 보이스를 어디서 쓰나요?",
  },
  {
    answer: "TODO, 일정, 채팅, 알림, 타이머 원본은 서버에 둡니다. 개인 에이전트 원문, 상세 위젯 사용 이벤트, 로컬 캐시와 복구 대기열은 기기 안 저장소에 둡니다.",
    icon: Database,
    question: "로컬 SQLite에는 무엇을 저장하나요?",
  },
];

export default function FaqPage() {
  return (
    <>
      <PageHeading title="FAQ" description="Bubli 사용 전 자주 묻는 질문을 정리합니다." />
      <section className="public-faq" aria-label="자주 묻는 질문">
        <GlassPanel className="public-faq__intro">
          <Chip selected>사용 전 확인</Chip>
          <h2>웹, 앱, 버블, 자료 권한을 같은 기준으로 이해할 수 있게 정리했습니다</h2>
          <p>Bubli는 공개 사이트, 회원 웹 앱, Tauri 앱이 역할을 나눕니다. FAQ는 이 경계가 헷갈리지 않게 잡는 화면입니다.</p>
        </GlassPanel>
        <div className="public-faq__list">
          {faqItems.map((item) => {
            const Icon = item.icon;

            return (
              <GlassPanel as="article" className="public-faq__item" key={item.question}>
                <span className="bubli-icon-tile" aria-hidden="true">
                  <Icon size={18} strokeWidth={2.1} />
                </span>
                <div>
                  <h3>{item.question}</h3>
                  <p>{item.answer}</p>
                </div>
              </GlassPanel>
            );
          })}
        </div>
      </section>
    </>
  );
}
