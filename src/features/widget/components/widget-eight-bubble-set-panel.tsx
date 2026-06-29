import { BubbleCard } from "@/components/bubbles";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import type { BubbleType } from "@/components/bubbles/bubble-card";

export type WidgetEightBubbleState = "ready" | "empty" | "loading" | "error";

const bubbles: Array<{
  items: string[];
  meta: string;
  progressLabel?: string;
  progressValue?: number;
  title: string;
  type: BubbleType;
}> = [
  { items: ["1차 번역본 검토", "검수 기준 질문 정리"], meta: "8건", progressLabel: "완료 3/8", progressValue: 38, title: "TODO 버블", type: "todo" },
  { items: ["확인 질문 후보 2개", "WBS 후보 3개"], meta: "승인 전", title: "에이전트 버블", type: "agent" },
  { items: ["프로젝트룸 새 메시지", "보이스 참여자 2명"], meta: "소통", title: "소통 버블", type: "communication" },
  { items: ["비정상 종료 복구 가능"], meta: "03:42", progressLabel: "오늘 누적", progressValue: 68, title: "타이머 버블", type: "timer" },
  { items: ["회의 중 빠른 기록", "개인 메모 초안"], meta: "로컬 초안", title: "메모 버블", type: "memo" },
  { items: ["10:30 확인 미팅", "D-2 납품 마감"], meta: "오늘", title: "일정/WBS 버블", type: "schedule" },
  { items: ["번역 계약서_v2.pdf", "회의록_0618.md"], meta: "관련 자료", title: "자료 제안 버블", type: "resource" },
  { items: ["확인 필요 3건", "타이머 동기화 완료"], meta: "알림", title: "알림 버블", type: "notification" },
];

function WidgetEightBubbleStatePanel({ state }: { state: Exclude<WidgetEightBubbleState, "ready"> }) {
  const copy = {
    empty: "켜진 버블이 없습니다. 사용자는 필요한 버블만 선택해 작업 화면 위에 띄울 수 있습니다.",
    error: "버블 표시 데이터를 불러오지 못했습니다. 서버 원본과 로컬 캐시를 다시 확인합니다.",
    loading: "위젯 설정과 최근 표시 데이터를 불러오는 중입니다.",
  }[state];

  return (
    <GlassPanel className="widget-eight-state">
      <Chip selected>{state === "loading" ? "로딩" : state === "empty" ? "빈 상태" : "오류"}</Chip>
      <h2>버블 위젯 8종</h2>
      <p>{copy}</p>
      <Button disabled={state === "loading"} variant={state === "error" ? "primary" : "quiet"}>
        {state === "error" ? "다시 불러오기" : "위젯 설정"}
      </Button>
    </GlassPanel>
  );
}

export function WidgetEightBubbleSetPanel({ state = "ready" }: { state?: WidgetEightBubbleState }) {
  if (state !== "ready") {
    return <WidgetEightBubbleStatePanel state={state} />;
  }

  return (
    <section className="widget-eight" aria-label="버블 위젯 8종">
      <div className="widget-eight__head">
        <div>
          <Chip selected>버블 8종</Chip>
          <h2>작업 중 필요한 정보만 버블로 남깁니다</h2>
          <p>각 버블은 개인 영역입니다. 표시 데이터는 서버 원본과 권한을 기준으로 가져오고, 상세 사용 이벤트는 기기 안에 남깁니다.</p>
        </div>
        <Button variant="quiet">표시 순서 조정</Button>
      </div>
      <div className="widget-eight__grid">
        {bubbles.map((bubble) => (
          <BubbleCard key={bubble.type} {...bubble} />
        ))}
      </div>
    </section>
  );
}
