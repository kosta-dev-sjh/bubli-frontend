import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  ManagedFolderS3HandoffPanel,
  defaultFolderEvents,
  defaultFolderHandoffRules,
} from "./managed-folder-s3-handoff-panel";

const meta = {
  component: ManagedFolderS3HandoffPanel,
  parameters: {
    docs: {
      description: {
        component:
          "Tauri 관리 폴더에서 발견한 파일 변경을 로컬 색인, 사용자 선택, S3 업로드, 자료보드 연결로 나눠 보여주는 패널입니다.",
      },
    },
  },
  title: "ManagedFolder/ManagedFolderS3HandoffPanel",
} satisfies Meta<typeof ManagedFolderS3HandoffPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    events: defaultFolderEvents,
    folderName: "Bubli 번역 자료",
    quotaPercent: 64,
    rules: defaultFolderHandoffRules,
    selectedProjectRoom: "번역 프로젝트룸",
  },
};

export const QuotaWarning: Story = {
  args: {
    events: defaultFolderEvents.map((event) => ({
      ...event,
      status: event.status === "LINKED" ? "UPLOAD_WAITING" : event.status,
    })),
    folderName: "클라이언트 전달 자료",
    quotaPercent: 86,
    rules: defaultFolderHandoffRules,
    selectedProjectRoom: "웹사이트 개편 프로젝트룸",
    title: "관리 폴더 용량 확인",
  },
};

export const VersionReview: Story = {
  args: {
    events: defaultFolderEvents.map((event) => ({
      ...event,
      status: "REVIEW_NEEDED",
      target: "NEW_VERSION",
    })),
    folderName: "최종 납품 폴더",
    quotaPercent: 42,
    rules: defaultFolderHandoffRules,
    selectedProjectRoom: "제품 소개 프로젝트룸",
    title: "새 버전 반영 확인",
  },
};
