export const siteConfig = {
  name: "Bubli",
  tagline: "받은 자료를, 오늘 할 일로.",
  description:
    "업무 문서, 요구사항, 회의록을 업무 구조로 바꾸고 오늘 필요한 일을 정리해주는 프리랜서 업무 비서",
  publicNav: [
    { href: "/", label: "홈" },
    { href: "/download", label: "다운로드" },
  ],
  appNav: [
    // 홈(/app)은 사이드바 상단 브랜드 로고가 담당하므로 별도 아이콘을 두지 않는다(중복 제거).
    { href: "/app/calendar", label: "일정" },
    { href: "/app/project-rooms", label: "프로젝트룸" },
    { href: "/app/resources", label: "자료보드" },
    { href: "/app/chat", label: "소통" },
    { href: "/app/agent", label: "AI 후보함" },
    { href: "/app/settings", label: "설정" },
  ],
} as const;
