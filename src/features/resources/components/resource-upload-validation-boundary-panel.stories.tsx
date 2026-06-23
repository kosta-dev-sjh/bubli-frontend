import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  ResourceUploadValidationBoundaryPanel,
  type ResourceUploadValidationBoundaryPanelProps,
} from "./resource-upload-validation-boundary-panel";

const demoProps: ResourceUploadValidationBoundaryPanelProps = {
  items: [
    {
      checksumLabel: "checksum 새 값",
      extensionLabel: "PDF 허용",
      fileName: "번역계약서_v2.pdf",
      mimeLabel: "application/pdf",
      reason: "프로젝트룸 자료로 저장한 뒤 분석 job을 시작할 수 있습니다.",
      sizeLabel: "2.4MB",
      status: "ready",
      targetLabel: "프로젝트룸 자료",
    },
    {
      checksumLabel: "checksum 동일",
      extensionLabel: "MD 허용",
      fileName: "요구사항_정리.md",
      mimeLabel: "text/markdown",
      reason: "같은 파일의 분석 결과가 있어 기존 후보 목록을 이어서 보여줍니다.",
      sizeLabel: "84KB",
      status: "reused",
      targetLabel: "프로젝트룸 자료",
    },
    {
      checksumLabel: "계산 대기",
      extensionLabel: "ZIP 제외",
      fileName: "원본자료_전체.zip",
      mimeLabel: "application/zip",
      reason: "지원 형식이 아니므로 서버 저장과 분석 요청을 시작하지 않습니다.",
      sizeLabel: "38MB",
      status: "blocked",
      targetLabel: "개인 자료",
    },
    {
      checksumLabel: "checksum 확인 중",
      extensionLabel: "DOCX 허용",
      fileName: "회의결정_2026-06-20.docx",
      mimeLabel: "문서 형식 확인 중",
      reason: "브라우저가 넘긴 MIME type을 확인한 뒤 업로드 가능 여부를 표시합니다.",
      sizeLabel: "1.1MB",
      status: "checking",
      targetLabel: "프로젝트룸 자료",
    },
  ],
  summary: {
    allowedFormatCount: 12,
    checkedFileCount: 4,
    maxFileSizeLabel: "100MB",
    readyFileCount: 3,
  },
};

const meta = {
  args: demoProps,
  component: ResourceUploadValidationBoundaryPanel,
  parameters: {
    layout: "fullscreen",
  },
  render: (args) => (
    <main className="shell">
      <ResourceUploadValidationBoundaryPanel {...args} />
    </main>
  ),
  title: "features/resources/ResourceUploadValidationBoundaryPanel",
} satisfies Meta<typeof ResourceUploadValidationBoundaryPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
