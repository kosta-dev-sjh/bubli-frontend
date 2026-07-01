import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  DesktopDownloadHandoffPanel,
  defaultDesktopCapabilities,
  defaultDownloadRules,
  defaultDownloadSurfaces,
} from "./desktop-download-handoff-panel";

const meta = {
  component: DesktopDownloadHandoffPanel,
  parameters: {
    docs: {
      description: {
        component:
          "v15의 공개 사이트, 작업공간, 데스크탑 앱 분리 기준을 바탕으로 다운로드 화면에서 데스크탑 앱의 역할과 회원 화면/버블/기기 기능 연결을 설명하는 패널입니다.",
      },
    },
  },
  title: "Features/Download/DesktopDownloadHandoffPanel",
} satisfies Meta<typeof DesktopDownloadHandoffPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    capabilities: defaultDesktopCapabilities,
    rules: defaultDownloadRules,
    surfaces: defaultDownloadSurfaces,
  },
};

export const Compact: Story = {
  args: {
    capabilities: defaultDesktopCapabilities.slice(0, 3),
    rules: defaultDownloadRules,
    surfaces: defaultDownloadSurfaces,
    title: "Bubli 데스크탑 앱",
  },
};

export const CommunicationFocused: Story = {
  args: {
    capabilities: defaultDesktopCapabilities.filter((capability) =>
      ["MEMBER_WEB_WINDOW", "COMMUNICATION"].includes(capability.kind),
    ),
    rules: defaultDownloadRules.filter((rule) => ["공개 화면", "보이스 연결"].includes(rule.label)),
    surfaces: defaultDownloadSurfaces,
    title: "웹과 앱의 소통 연결",
  },
};
