export const siteConfig = {
  name: "Bubli",
  tagline: "받은 자료를, 오늘 할 일로.",
  description:
    "계약서, 요구사항, 회의록을 업무 구조로 바꾸고 오늘 필요한 일을 정리해주는 프리랜서 업무 비서",
  publicNav: [
    { href: "/", label: "홈" },
    { href: "/features", label: "기능" },
    { href: "/#download", label: "다운로드" },
    { href: "/faq", label: "FAQ" },
  ],
  appNav: [
    { href: "/app", label: "대시보드" },
    { href: "/app/project-rooms", label: "프로젝트룸" },
    { href: "/app/resources", label: "자료보드" },
    { href: "/app/agent", label: "후보" },
    { href: "/app/calendar", label: "일정" },
    { href: "/app/settings", label: "설정" },
  ],
} as const;
