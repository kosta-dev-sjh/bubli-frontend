import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  defaultSeedDocuments,
  defaultSeedFields,
  defaultSeedTargets,
  ProjectRoomDocumentSeedPanel,
} from "./project-room-document-seed-panel";

const meta = {
  component: ProjectRoomDocumentSeedPanel,
  parameters: {
    docs: {
      description: {
        component:
          "v15의 프로젝트룸 생성 흐름을 바탕으로, 문서 업로드 뒤 에이전트 후보를 확인하고 승인된 값만 초기 데이터로 반영하는 패널입니다.",
      },
    },
  },
  title: "Features/ProjectRoom/ProjectRoomDocumentSeedPanel",
} satisfies Meta<typeof ProjectRoomDocumentSeedPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    documents: defaultSeedDocuments,
    fields: defaultSeedFields,
    progressPercent: 64,
    targets: defaultSeedTargets,
  },
};

export const NeedsMoreReview: Story = {
  args: {
    documents: [
      ...defaultSeedDocuments,
      {
        filename: "회의록_2026-06-18.md",
        kind: "MEETING_NOTE",
        status: "NEEDS_REVIEW",
      },
    ],
    fields: defaultSeedFields.map((field) =>
      field.label === "납품물" || field.label === "금액 참고값" ? { ...field, status: "NEEDS_REVIEW" } : field,
    ),
    progressPercent: 42,
    targets: defaultSeedTargets,
    title: "확인할 값이 남은 프로젝트룸",
  },
};

export const ReadyToCreate: Story = {
  args: {
    documents: defaultSeedDocuments.map((document) => ({ ...document, status: "APPROVED" })),
    fields: defaultSeedFields.map((field) => ({ ...field, status: "APPROVED" })),
    progressPercent: 100,
    targets: defaultSeedTargets,
    title: "프로젝트룸 생성 준비 완료",
  },
};
