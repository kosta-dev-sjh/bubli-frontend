import { apiRequest } from "@/lib/api/client";
import type {
  LocalFileAnalysisRequest,
  LocalFileAnalysisResponse,
} from "@/types/api/localFileAnalysis";

// Personal managed-folder analysis flow: Tauri extracts important sentences
// locally, then the authenticated frontend asks the API server to run agents.
export const localFileAnalysisApi = {
  create(body: LocalFileAnalysisRequest) {
    return apiRequest<LocalFileAnalysisResponse>("/api/local-file-analyses", {
      body,
      method: "POST",
    });
  },
} as const;
