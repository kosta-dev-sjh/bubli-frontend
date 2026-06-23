import { GlassPanel } from "@/components/ui/glass-panel";

const fontRules = [
  {
    body: "첫 화면의 큰 문장에만 쓰고, 카드 안에서는 과하게 키우지 않습니다.",
    sample: "받은 자료를, 오늘 할 일로.",
    title: "히어로",
  },
  {
    body: "기능 카드와 업무 화면은 빠르게 훑을 수 있도록 15px/24px 흐름을 기준으로 둡니다.",
    sample: "자료를 프로젝트룸에 모으고 후보를 확인합니다.",
    title: "본문",
  },
  {
    body: "버블 안의 글자는 작은 화면 위에서도 읽히도록 12.5px 이상을 유지합니다.",
    sample: "WBS 후보 3개 검토",
    title: "버블",
  },
];

export function FontStrategyPanel() {
  return (
    <section className="font-strategy" aria-label="글자 전략">
      <div className="font-strategy__grid">
        {fontRules.map((rule) => (
          <GlassPanel className="font-strategy__card" key={rule.title}>
            <b>{rule.title}</b>
            <div className="font-strategy__sample">{rule.sample}</div>
            <p>{rule.body}</p>
          </GlassPanel>
        ))}
      </div>
    </section>
  );
}
