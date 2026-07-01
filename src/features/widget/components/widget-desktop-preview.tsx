import { EyeOff, Minimize2, Pin } from "lucide-react";

import { BubbleCard } from "@/components/bubbles/bubble-card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";

export function WidgetDesktopPreview() {
  return (
    <section className="widget-preview" aria-label="데스크톱 버블 위젯 미리보기">
      <div className="widget-preview__toolbar">
        <div>
          <h2>버블 위젯</h2>
          <p>위젯은 개인 영역입니다. 사용자가 접근 권한을 가진 데이터만 작업 중 화면 위에 표시합니다.</p>
        </div>
        <div className="widget-preview__controls">
          <Button icon={<Pin size={15} />} size="sm" variant="quiet">
            고정
          </Button>
          <Button icon={<EyeOff size={15} />} size="sm" variant="quiet">
            고스트
          </Button>
          <Button icon={<Minimize2 size={15} />} size="sm" variant="quiet">
            최소화
          </Button>
        </div>
      </div>

      <div className="widget-preview__desktop">
        <div className="widget-preview__app-frame">
          <Chip selected>회원 웹 앱</Chip>
          <h3>토모에 번역 프로젝트</h3>
          <p>메인 화면은 회원 업무 흐름을 이어가고, 버블은 데스크톱 앱에서 작업 화면 위에 따로 띄웁니다.</p>
        </div>

        <div className="widget-preview__bubble-layer" aria-label="버블 레이어">
          <BubbleCard
            className="widget-preview__bubble widget-preview__bubble--todo"
            items={["1차 번역본 검토", "검수 기준 질문 정리", "용어집 초안 정리"]}
            meta="오늘"
            progressLabel="오늘 할 일"
            progressValue={62}
            type="todo"
          />
          <BubbleCard
            className="widget-preview__bubble widget-preview__bubble--agent"
            displayMode="ghost"
            items={["확인 질문 후보 2개", "WBS 후보 3개"]}
            meta="승인 전"
            type="agent"
          />
          <BubbleCard
            className="widget-preview__bubble widget-preview__bubble--timer"
            items={["비정상 종료 후 복구 가능"]}
            meta="42:18"
            type="timer"
          />
          <BubbleCard
            className="widget-preview__bubble widget-preview__bubble--communication"
            displayMode="minimized"
            meta="새 메시지 2개"
            type="communication"
          />
        </div>

        <div className="widget-preview__dock" aria-label="버블 독">
          <Chip selected>TODO</Chip>
          <Chip>에이전트</Chip>
          <Chip>소통</Chip>
          <Chip>타이머</Chip>
        </div>
      </div>

      <div className="widget-preview__policy">
        <GlassPanel className="widget-preview__policy-card">
          <b>서버 원본</b>
          <p>TODO, 일정, 채팅, 알림, 타이머는 서버에 남은 값을 기준으로 표시합니다.</p>
        </GlassPanel>
        <GlassPanel className="widget-preview__policy-card">
          <b>기기 안 기록</b>
          <p>빠른 표시, 상세 사용 기록, 타이머 복구, 전송 대기 작업에 사용합니다.</p>
        </GlassPanel>
        <GlassPanel className="widget-preview__policy-card">
          <b>개인 영역</b>
          <p>버블은 프로젝트룸 화면 복제가 아니라 사용자를 따라다니는 개인 작업 인터페이스입니다.</p>
        </GlassPanel>
      </div>
    </section>
  );
}
