"use client";

import { PageHeading } from "@/components/ui/page-heading";
import { AgentSuggestionInboxPanel } from "@/features/agent/components";

export default function AgentSuggestionsPage() {
  return (
    <>
      <PageHeading
        title="제안함"
        description="에이전트가 만든 요구사항, WBS, TODO, 질문, 일정 후보를 승인 전 상태로 확인합니다."
      />
      <AgentSuggestionInboxPanel />
    </>
  );
}
