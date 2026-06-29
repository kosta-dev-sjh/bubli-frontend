import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "src-tauri/target/**", "storybook-static/**", ".claude/**", "docs/**"],
  },
  ...nextVitals,
  ...nextTs,
  {
    // 분리 호스팅 경계: 공개(비회원)/로그인 영역은 회원(workspace) 전용 코드를 import할 수 없다.
    // 공유 가능한 것은 components/ui, bubbles, theme, layout/public-header 같은 디자인 시스템뿐이다.
    files: ["src/app/(public)/**", "src/app/(auth)/**", "src/features/public-site/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/app/(workspace)/**",
                "@/features/activity/**",
                "@/features/agent/**",
                "@/features/calendar/**",
                "@/features/communication/**",
                "@/features/dashboard/**",
                "@/features/managed-folder/**",
                "@/features/memo/**",
                "@/features/notification/**",
                "@/features/project-room/**",
                "@/features/resources/**",
                "@/features/settings/**",
                "@/features/timer/**",
                "@/features/todo/**",
                "@/features/wbs/**",
                "@/features/widget/**",
                "@/components/dashboard/**",
                "@/components/widget/**",
                "@/components/layout/app-shell",
                "@/components/layout/app-nav",
                "@/components/layout/workspace-topbar",
              ],
              message:
                "공개/로그인 영역은 회원(workspace) 전용 코드를 import할 수 없다. 분리 호스팅 경계 유지 — 공유는 디자인 시스템(components/ui, bubbles, theme)만.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
