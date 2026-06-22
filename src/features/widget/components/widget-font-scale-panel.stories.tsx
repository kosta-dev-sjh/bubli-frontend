import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  defaultFontScaleOptions,
  defaultFontScaleSurfaces,
  WidgetFontScalePanel,
} from "./widget-font-scale-panel";

const meta = {
  component: WidgetFontScalePanel,
  parameters: {
    docs: {
      description: {
        component:
          "v14의 user_preferences.font_scale와 v20 디자인보드의 90, 100, 115, 130 글자 크기 단계를 화면으로 검토하는 위젯 설정 패널입니다.",
      },
    },
  },
  title: "Widget/WidgetFontScalePanel",
} satisfies Meta<typeof WidgetFontScalePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DefaultScale: Story = {
  args: {
    activeScale: 100,
    affectedSurfaces: defaultFontScaleSurfaces,
    ghostModeBoost: true,
    scaleOptions: defaultFontScaleOptions,
  },
};

export const LargeTextScale: Story = {
  args: {
    activeScale: 130,
    affectedSurfaces: defaultFontScaleSurfaces,
    ghostModeBoost: true,
    scaleOptions: defaultFontScaleOptions,
    title: "큰 글자 모드",
  },
};

export const CompactScale: Story = {
  args: {
    activeScale: 90,
    affectedSurfaces: defaultFontScaleSurfaces,
    ghostModeBoost: false,
    scaleOptions: defaultFontScaleOptions,
    title: "넓게 보기 설정",
  },
};
