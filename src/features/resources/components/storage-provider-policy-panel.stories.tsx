import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { StorageProviderPolicyPanel } from "./storage-provider-policy-panel";

const meta = {
  component: StorageProviderPolicyPanel,
  parameters: {
    docs: {
      description: {
        component:
          "자료 저장소가 로컬 검증에서 S3로 바뀌어도 자료보드와 다운로드 화면은 같은 권한 기준을 사용한다는 정책을 보여줍니다.",
      },
    },
  },
  title: "Features/Resources/StorageProviderPolicyPanel",
} satisfies Meta<typeof StorageProviderPolicyPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const S3ReadyPolicy: Story = {
  args: {
    currentProviderLabel: "S3 저장소",
    downloadRuleLabel: "서버 확인 후 내려받기 주소 발급",
    limitLabel: "1GB 중 360MB 사용",
    steps: [
      {
        description: "파일 원본은 S3에 있고, DB에는 storage_key와 size_bytes를 남깁니다.",
        label: "파일 원본",
        status: "ready",
        value: "S3",
      },
      {
        description: "PERSONAL은 owner_id, ROOM_SHARED는 room_members 기준으로 확인합니다.",
        label: "접근 판단",
        status: "ready",
        value: "visibility",
      },
      {
        description: "권한이 확인된 사용자에게만 내려받기 주소를 발급합니다.",
        label: "다운로드",
        status: "ready",
        value: "download-url",
      },
      {
        description: "현재 사용량이 제한보다 낮아 서버 업로드를 계속 받을 수 있습니다.",
        label: "용량",
        status: "ready",
        value: "36%",
      },
    ],
    usageLabel: "360MB 사용",
    usagePercent: 36,
  },
};

export const LocalFallbackWithQuotaBlock: Story = {
  args: {
    currentProviderLabel: "로컬 검증",
    downloadRuleLabel: "권한 확인 전 파일 접근 차단",
    failureReason: "STORAGE_LIMIT_EXCEEDED: 개인 자료함 용량을 넘어 서버 업로드가 보류되었습니다.",
    limitLabel: "1GB 중 1.12GB 사용",
    steps: [
      {
        description: "S3 전환 전에는 StorageService 구현만 바꿔 같은 화면 계약을 유지합니다.",
        label: "파일 원본",
        status: "checking",
        value: "Local",
      },
      {
        description: "서버에는 사용자가 동기화를 승인한 자료만 반영합니다.",
        label: "동기화",
        status: "limited",
        value: "승인 필요",
      },
      {
        description: "권한 확인은 경로명이 아니라 서버의 자료 메타데이터로 판단합니다.",
        label: "접근 판단",
        status: "ready",
        value: "server",
      },
      {
        description: "용량 초과 상태라 로컬 색인은 유지하고 서버 업로드는 차단합니다.",
        label: "용량",
        status: "blocked",
        value: "112%",
      },
    ],
    usageLabel: "1.12GB 사용",
    usagePercent: 112,
  },
};
