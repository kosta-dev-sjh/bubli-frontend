import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  defaultQuotaFiles,
  defaultQuotaRules,
  defaultStorageUsage,
  PersonalResourceQuotaPanel,
} from "./personal-resource-quota-panel";

const meta = {
  component: PersonalResourceQuotaPanel,
  parameters: {
    docs: {
      description: {
        component:
          "v15의 개인 자료함 동기화, 저장 용량, 기기 안 색인 정책을 바탕으로 서버 반영 가능 여부를 보여주는 패널입니다.",
      },
    },
  },
  title: "Features/Resources/PersonalResourceQuotaPanel",
} satisfies Meta<typeof PersonalResourceQuotaPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NearLimit: Story = {
  args: {
    files: defaultQuotaFiles,
    rules: defaultQuotaRules,
    usage: defaultStorageUsage,
  },
};

export const HealthyStorage: Story = {
  args: {
    files: defaultQuotaFiles.filter((file) => file.status !== "STORAGE_LIMIT_EXCEEDED"),
    rules: defaultQuotaRules,
    title: "개인 자료함 여유 상태",
    usage: {
      limitLabel: "1GB",
      percent: 46,
      remainingLabel: "540MB 남음",
      usedLabel: "460MB 사용",
    },
  },
};

export const OverLimit: Story = {
  args: {
    files: [
      ...defaultQuotaFiles,
      {
        filename: "시안_원본_묶음.zip",
        pathLabel: "서버 반영 차단",
        sizeLabel: "310MB",
        status: "STORAGE_LIMIT_EXCEEDED",
      },
    ],
    rules: defaultQuotaRules,
    title: "용량 초과 상태",
    usage: {
      limitLabel: "1GB",
      percent: 96,
      remainingLabel: "40MB 남음",
      usedLabel: "960MB 사용",
    },
  },
};
