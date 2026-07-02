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
          "자료 업로드 이후 서버 저장, 텍스트 추출, 의미 검색 준비, 에이전트 후보 생성 흐름을 단계별로 보여주는 패널입니다. API 계약이 바뀌어도 화면은 props 기준으로 유지하고 연결부만 교체할 수 있게 분리합니다.",
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
        detailLabelKey: "resources.processing.stepUploadDetail",
        kind: "UPLOAD",
        labelKey: "resources.processing.stepUploadLabel",
        progress: 100,
        status: "SUCCEEDED",
        supportingTextKey: "resources.processing.stepUploadText",
      },
      {
        detailLabelKey: "resources.processing.stepExtractDetail",
        kind: "TEXT_EXTRACTION",
        labelKey: "resources.processing.stepExtractLabel",
        progress: 26,
        status: "FAILED",
        supportingTextKey: "resources.processing.stepExtractText",
      },
      {
        detailLabelKey: "resources.processing.stepChunkDetail",
        kind: "CHUNKING",
        labelKey: "resources.processing.stepChunkLabel",
        progress: 0,
        status: "PENDING",
        supportingTextKey: "resources.processing.stepChunkText",
      },
      {
        detailLabelKey: "resources.processing.stepEmbedDetail",
        kind: "EMBEDDING",
        labelKey: "resources.processing.stepEmbedLabel",
        progress: 0,
        status: "PENDING",
        supportingTextKey: "resources.processing.stepEmbedText",
      },
      {
        detailLabelKey: "resources.processing.stepAnalysisDetail",
        kind: "ANALYSIS",
        labelKey: "resources.processing.stepAnalysisLabel",
        progress: 0,
        status: "PENDING",
        supportingTextKey: "resources.processing.stepAnalysisText",
      },
      {
        detailLabelKey: "resources.processing.stepRelationDetail",
        kind: "RELATION",
        labelKey: "resources.processing.stepRelationLabel",
        progress: 0,
        status: "PENDING",
        supportingTextKey: "resources.processing.stepRelationText",
      },
    ],
    visibility: "PERSONAL",
  },
};
