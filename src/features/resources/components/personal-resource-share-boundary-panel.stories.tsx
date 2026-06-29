import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  PersonalResourceShareBoundaryPanel,
  defaultBoundarySteps,
  defaultShareResources,
} from "./personal-resource-share-boundary-panel";

const meta = {
  component: PersonalResourceShareBoundaryPanel,
  parameters: {
    docs: {
      description: {
        component:
          "개인 자료함의 파일이 사용자의 확인 없이 프로젝트룸 자료로 보이지 않도록, 공유 전 대상과 권한 경계를 확인하는 자료보드 패널입니다.",
      },
    },
  },
  title: "Features/Resources/PersonalResourceShareBoundaryPanel",
} satisfies Meta<typeof PersonalResourceShareBoundaryPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    resources: defaultShareResources,
    selectedCount: 2,
    steps: defaultBoundarySteps,
    targetProjectRoom: "신규 번역 프로젝트룸",
  },
};

export const ReviewNeeded: Story = {
  args: {
    resources: defaultShareResources.map((resource) => ({
      ...resource,
      readiness: resource.fileName.includes("노트") ? "PRIVATE_ONLY" : "NEEDS_REVIEW",
    })),
    selectedCount: 1,
    steps: defaultBoundarySteps,
    targetProjectRoom: "웹사이트 개편 프로젝트룸",
    title: "공유 전 확인 필요",
  },
};

export const EmptySelection: Story = {
  args: {
    resources: defaultShareResources.map((resource) => ({
      ...resource,
      linkedProjectRoom: undefined,
      readiness: "PRIVATE_ONLY",
    })),
    selectedCount: 0,
    steps: defaultBoundarySteps,
    targetProjectRoom: "선택된 프로젝트룸 없음",
    title: "개인 자료 선택 대기",
  },
};
