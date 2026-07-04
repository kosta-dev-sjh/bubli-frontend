import type { Preview } from "@storybook/nextjs-vite";
import { createElement } from "react";

import { ThemeProvider } from "../src/components/theme";
import { I18nProvider } from "../src/lib/i18n";
import "../src/styles/globals.css";

const preview: Preview = {
  // 모든 스토리를 I18nProvider + ThemeProvider로 감싸 useI18n()/t()/useTheme()가 스토리북에서도 동작하도록 한다.
  // (프로필 메뉴의 ThemeToggle처럼 useTheme를 쓰는 컴포넌트가 스토리에서 열려도 안전하다. 저장은 끈다.)
  decorators: [
    (Story) =>
      createElement(
        I18nProvider,
        null,
        createElement(ThemeProvider, { enableStorage: false }, createElement(Story)),
      ),
  ],
  parameters: {
    a11y: {
      test: "todo",
    },
    backgrounds: {
      default: "Bubli",
      values: [{ name: "Bubli", value: "#F7F9FA" }],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "centered",
  },
};

export default preview;
