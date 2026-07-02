import type { AgentJobResponse } from "@/types/api/agent";

export type LocalFileAnalysisKeySentence = {
  endOffset: number;
  index: number;
  score: number;
  startOffset: number;
  text: string;
};

export type LocalFileAnalysisRequest = {
  analyzedCharCount: number;
  checksum?: string | null;
  combinedText: string;
  extractionMethod: "BM25_MMR_KEY_SENTENCE_V1" | string;
  fileName: string;
  keySentences: LocalFileAnalysisKeySentence[];
  localFileId: string;
  mimeType?: string | null;
  sourceCharCount: number;
  textTruncated: boolean;
};

export type LocalFileAnalysisResponse = AgentJobResponse;
