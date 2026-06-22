import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ResourceProcessingStatusPanel } from "@/features/resources/components/resource-processing-status-panel";

const meta = {
  argTypes: {
    onOpenAnalysis: { action: "open analysis candidates" },
    onOpenResource: { action: "open resource" },
    onRetryFailedStep: { action: "retry failed step" },
  },
  component: ResourceProcessingStatusPanel,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 1120 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "자료 업로드 이후 서버 원본 저장, 텍스트 추출, 의미 검색 준비, 에이전트 후보 생성 흐름을 단계별로 보여주는 패널입니다. API 계약이 바뀌어도 화면은 props 기준으로 유지하고 연결부만 교체할 수 있게 분리합니다.",
      },
    },
  },
  title: "Features/Resources/ResourceProcessingStatusPanel",
} satisfies Meta<typeof ResourceProcessingStatusPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AnalyzingProjectRoomResource: Story = {
  args: {
    resourceTitle: "번역계약서_v2.pdf",
    status: "ANALYZING",
    visibility: "ROOM_SHARED",
  },
};

export const FailedTextExtraction: Story = {
  args: {
    resourceTitle: "스캔본_요구사항_초안.pdf",
    status: "FAILED",
    steps: [
      {
        detailLabel: "S3 저장",
        kind: "UPLOAD",
        label: "자료 업로드",
        progress: 100,
        status: "SUCCEEDED",
        supportingText: "원본 파일은 서버 저장소에 보관되어 다시 내려받을 수 있습니다.",
      },
      {
        detailLabel: "PDF 텍스트",
        kind: "TEXT_EXTRACTION",
        label: "텍스트 추출",
        progress: 26,
        status: "FAILED",
        supportingText: "문서에서 텍스트를 읽지 못했습니다. 원문 파일을 확인하거나 다시 시도합니다.",
      },
      {
        detailLabel: "문서 조각",
        kind: "CHUNKING",
        label: "문서 분할",
        progress: 0,
        status: "PENDING",
        supportingText: "텍스트 추출이 끝난 뒤 검색 가능한 단위로 나눕니다.",
      },
      {
        detailLabel: "pgvector",
        kind: "EMBEDDING",
        label: "의미 검색 준비",
        progress: 0,
        status: "PENDING",
        supportingText: "관련 문서 추천을 위해 의미 검색 데이터를 저장합니다.",
      },
      {
        detailLabel: "후보 생성",
        kind: "ANALYSIS",
        label: "자료 분석",
        progress: 0,
        status: "PENDING",
        supportingText: "사용자가 확인할 작업 범위와 WBS/TODO 후보를 생성합니다.",
      },
      {
        detailLabel: "관련 문서",
        kind: "RELATION",
        label: "관련 자료 연결",
        progress: 0,
        status: "PENDING",
        supportingText: "접근 가능한 자료 안에서 현재 문서와 이어지는 자료를 찾습니다.",
      },
    ],
    visibility: "PERSONAL",
  },
};
