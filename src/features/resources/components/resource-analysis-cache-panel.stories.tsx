import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ResourceAnalysisCachePanel } from "./resource-analysis-cache-panel";

const meta = {
  component: ResourceAnalysisCachePanel,
  parameters: {
    docs: {
      description: {
        component:
          "같은 파일 지문 반복 분석을 막고, 기존 결과 사용과 새 에이전트 정리 작업 생성을 구분하는 자료 분석 정책 패널입니다.",
      },
    },
  },
  title: "Features/Resources/ResourceAnalysisCachePanel",
} satisfies Meta<typeof ResourceAnalysisCachePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CacheHitAndMiss: Story = {
  args: {
    entries: [
      {
        description: "같은 파일 지문의 이전 분석 결과가 있어 새 분석 없이 결과를 다시 보여줍니다.",
        fileName: "요구사항_정의서_v1.3.pdf",
        hashLabel: "파일 지문 7f2a...91c0",
        status: "hit",
        updatedAtLabel: "분석 2일 전",
      },
      {
        description: "새 파일이므로 에이전트 정리 작업을 만들고 분석 결과를 후보로 분리 저장합니다.",
        fileName: "회의록_2026-06-23.md",
        hashLabel: "파일 지문 c83d...12aa",
        status: "miss",
        updatedAtLabel: "방금 업로드",
      },
      {
        description: "캐시 기준 기간을 지나 다시 분석할 수 있습니다.",
        fileName: "견적서_old.xlsx",
        hashLabel: "파일 지문 a1d0...e885",
        status: "expired",
        updatedAtLabel: "분석 31일 전",
      },
    ],
    metrics: [
      {
        description: "같은 파일인지 판단하는 기준입니다.",
        icon: "hash",
        label: "중복 기준",
        value: "파일 지문",
      },
      {
        description: "기획서 기준 후보 기간입니다.",
        icon: "cache",
        label: "캐시 기간",
        value: "7~30일",
      },
      {
        description: "새 분석이 필요할 때만 만듭니다.",
        icon: "job",
        label: "실행 단위",
        value: "정리 작업",
      },
      {
        description: "자료 원본과 분리해서 저장합니다.",
        icon: "result",
        label: "결과 저장",
        value: "분석 후보",
      },
    ],
  },
};

export const FailedAnalysisRetry: Story = {
  args: {
    entries: [
      {
        description: "분석 실패가 전체 자료보드 장애로 이어지지 않도록 실패 상태와 재시도 진입점을 보여줍니다.",
        fileName: "스캔본_기준 자료.pdf",
        hashLabel: "파일 지문 991e...7dd4",
        status: "failed",
        updatedAtLabel: "실패 12분 전",
      },
    ],
    metrics: [
      {
        description: "같은 파일이면 실패 기록도 추적할 수 있습니다.",
        icon: "hash",
        label: "파일 기준",
        value: "hash",
      },
      {
        description: "실패 후 무한 반복 호출을 막습니다.",
        icon: "cache",
        label: "호출 절약",
        value: "제한",
      },
      {
        description: "상태는 PENDING, RUNNING, SUCCEEDED, FAILED로 확인합니다.",
        icon: "job",
        label: "job 상태",
        value: "FAILED",
      },
      {
        description: "성공한 결과만 자료 상세와 데스크탑 위젯에 표시합니다.",
        icon: "result",
        label: "결과 표시",
        value: "보류",
      },
    ],
  },
};
