import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Reveal } from "@/features/public-site/components/reveal";

const flowSteps = [
  {
    body: "계약서, 요구사항, 회의록을 프로젝트룸 기준으로 모읍니다.",
    meta: "들어온 자료",
    title: "자료 업로드",
  },
  {
    body: "작업 범위, 확인 질문, WBS/TODO 후보를 제안합니다.",
    meta: "정리 후보",
    title: "후보 생성",
  },
  {
    body: "사용자가 확인한 항목만 실제 작업으로 이어집니다.",
    meta: "사용자 확인",
    title: "사용자 승인",
  },
  {
    body: "같은 TODO를 작업판, 대시보드, 버블에서 함께 봅니다.",
    meta: "실행 화면",
    title: "버블 표시",
  },
];

export function PublicHomeFlow() {
  return (
    <section className="public-home-flow" aria-label="Bubli 핵심 업무 흐름">
      <GlassPanel className="public-home-flow__main" padded={false}>
        <div className="public-home-flow__copy">
          <Chip selected>핵심 흐름</Chip>
          <h2>
            자료를 올리면
            <br />
            오늘 일이 정리됩니다
          </h2>
          <p>
            계약서와 요구사항을 올리고, 사용자가 후보를 확인하면 같은 TODO가 작업판, 대시보드, 버블로 이어집니다.
          </p>
        </div>

        <div className="public-home-flow__steps" aria-label="자료에서 버블까지 이어지는 순서">
          {flowSteps.map((step, index) => {
            return (
              <Reveal className="public-home-flow__step-reveal" delay={index * 90} key={step.title}>
                <article className="public-home-flow__step">
                  <span className="public-home-flow__step-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <span className="public-home-flow__step-meta">{step.meta}</span>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </GlassPanel>

      <GlassPanel className="public-home-flow__todo">
        <div className="public-home-flow__todo-head">
          <span className="public-home-flow__todo-signal" aria-hidden="true" />
          <div>
            <h3>하나의 할 일</h3>
            <p>복사하지 않고 필요한 화면에 같은 기준으로 표시합니다.</p>
          </div>
        </div>
        <div className="public-home-flow__todo-card">
          <b>계약서 검토 질문 정리</b>
          <span>D-2 · 내 TODO · 확인 필요</span>
        </div>
        <div className="public-home-flow__channels" aria-label="TODO가 표시되는 화면">
          <Chip>작업판</Chip>
          <Chip>대시보드</Chip>
          <Chip>일정</Chip>
          <Chip>TODO 버블</Chip>
        </div>
      </GlassPanel>
    </section>
  );
}
