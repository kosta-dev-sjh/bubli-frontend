import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AccessBoundaryMatrixPanel } from "@/features/settings/components/access-boundary-matrix-panel";

const meta = {
  component: AccessBoundaryMatrixPanel,
  parameters: {
    docs: {
      description: {
        component:
          "Bubli의 데이터 접근 경계를 화면 단위로 확인합니다. 개인 자료, 프로젝트룸 자료, 위젯, 기기 안 데이터가 같은 권한 기준으로 설명되는지 점검하는 컴포넌트입니다.",
      },
    },
  },
  title: "Features/Settings/AccessBoundaryMatrixPanel",
} satisfies Meta<typeof AccessBoundaryMatrixPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ProductAccessBoundaries: Story = {
  args: {
    items: [
      {
        allowed: "소유자 본인과 개인 에이전트만 볼 수 있습니다. 프로젝트룸에 보이게 하려면 사용자의 공유 승인이 필요합니다.",
        blocked: "프로젝트룸 멤버와 프로젝트룸 에이전트는 공유 승인 전 개인 자료를 볼 수 없습니다.",
        dataName: "개인 자료",
        note: "개인 자료는 자료보드에서 따로 표시하고, 공유 전에는 프로젝트룸 자료로 취급하지 않습니다.",
        ownerLabel: "소유자 기준",
        status: "limited",
        storageLabel: "서버 자료 저장소",
        tone: "personal",
      },
      {
        allowed: "프로젝트룸 멤버는 권한이 있는 자료, 댓글, 버전 기록을 볼 수 있습니다.",
        blocked: "프로젝트룸 밖 사용자와 나간 멤버는 자료, 다운로드, WBS, 일정에 접근할 수 없습니다.",
        dataName: "프로젝트룸 자료",
        note: "프로젝트룸 자료는 roomId와 멤버 권한을 확인한 뒤 열람과 다운로드 주소 발급을 처리합니다.",
        ownerLabel: "프로젝트룸 기준",
        status: "allowed",
        storageLabel: "서버 자료 저장소",
        tone: "room",
      },
      {
        allowed: "TODO, 일정, 알림, 타이머처럼 다시 보여줘야 하는 값은 서버 기록을 읽어 버블에 표시합니다.",
        blocked: "버블은 프로젝트룸 화면을 복제하지 않습니다. 사용자가 접근 권한을 가진 항목만 요약합니다.",
        dataName: "위젯 버블 표시 데이터",
        note: "상세 사용 이벤트는 기기 안에 남기고, 서버에는 항목 상태와 날짜별 집계만 저장합니다.",
        ownerLabel: "사용자 기준",
        status: "limited",
        storageLabel: "서버 기록과 기기 안 저장소",
        tone: "widget",
      },
      {
        allowed: "데스크탑 앱은 사용자가 지정한 폴더와 빠른 표시용 기록, 개인 에이전트 원문을 기기 안에서 다룹니다.",
        blocked: "전체 PC 파일, 화면 내용, 키보드 입력은 수집 대상이 아닙니다.",
        dataName: "기기 안 데이터",
        note: "기기 안 저장소가 손상되면 기기 안 백업으로 복구하고, 서버 기록은 다시 내려받습니다.",
        ownerLabel: "기기 기준",
        status: "limited",
        storageLabel: "기기 안 저장소",
        tone: "local",
      },
    ],
  },
};
