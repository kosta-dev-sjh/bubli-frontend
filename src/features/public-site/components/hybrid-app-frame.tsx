import { Globe2, MonitorDown, PanelTop } from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";

const frames = [
  {
    body: "서비스 소개, 기능 안내, 다운로드 진입을 맡습니다. 회원 자료는 보이지 않습니다.",
    icon: Globe2,
    title: "공개 사이트",
  },
  {
    body: "로그인 후 프로젝트룸, 자료보드, 작업판, 소통을 처리하는 실제 업무 공간입니다.",
    icon: PanelTop,
    title: "회원 웹 앱",
  },
  {
    body: "회원 웹 앱의 업무 흐름을 데스크탑에서 열고, 버블과 기기 기능을 더합니다.",
    icon: MonitorDown,
    title: "데스크탑 앱",
  },
];

export function HybridAppFrame() {
  return (
    <section className="hybrid-frame" aria-label="웹과 앱 역할 분리">
      <div className="hybrid-frame__grid">
        {frames.map((frame) => {
          const Icon = frame.icon;
          return (
            <GlassPanel className="hybrid-frame__card" key={frame.title}>
              <span className="bubli-icon-tile" aria-hidden="true">
                <Icon size={18} strokeWidth={2.1} />
              </span>
              <h3>{frame.title}</h3>
              <p>{frame.body}</p>
              <div className="hybrid-frame__sample" aria-hidden="true">
                <span className="hybrid-frame__sample-line" style={{ width: "72%" }} />
                <span className="hybrid-frame__sample-line" style={{ width: "92%" }} />
                <span className="hybrid-frame__sample-line" style={{ width: "58%" }} />
              </div>
            </GlassPanel>
          );
        })}
      </div>
      <div className="hybrid-frame__note">
        <Chip>설계 포인트</Chip>
        <span>회원 웹 앱 화면을 그대로 쓰고, 데스크탑에서만 필요한 위젯과 기기 기능을 덧붙입니다.</span>
      </div>
    </section>
  );
}
