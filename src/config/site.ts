export const siteConfig = {
  name: "Bubli",
  tagline: "받은 자료를, 오늘 일로.",
  description:
    "업무 문서, 요구사항, 회의록을 오늘 처리할 일로 정리해주는 프리랜서를 위한 업무 비서",
  publicNav: [
    { href: "/", label: "홈" },
    { href: "/#download", label: "다운로드" },
  ],
  appNav: [
    { href: "/app/calendar", label: "일정" },
    { href: "/app/project-rooms", label: "프로젝트룸" },
    { href: "/app/resources", label: "자료보드" },
    { href: "/app/chat", label: "소통" },
    { href: "/app/agent", label: "AI 후보군" },
    { href: "/app/settings", label: "설정" },
  ],
} as const;
