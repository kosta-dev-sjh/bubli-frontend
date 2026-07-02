import type { Preview } from "@storybook/nextjs-vite";
import { createElement } from "react";

import { I18nProvider } from "../src/lib/i18n";
import "../src/styles/globals.css";

const preview: Preview = {
  // 모든 스토리를 I18nProvider로 감싸 useI18n()/t()가 스토리북에서도 동작하도록 한다.
  decorators: [(Story) => createElement(I18nProvider, null, createElement(Story))],
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
