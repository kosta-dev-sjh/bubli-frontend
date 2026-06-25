import { PageHeading } from "@/components/ui/page-heading";
import {
  ChatCacheRecoveryPanel,
  ChatMessageComposer,
  ChatReadStatePanel,
  ChatRoomListPanel,
  ChatSequenceLoadingBoundaryPanel,
  CommunicationPanel,
  FriendInvitePanel,
  FriendRequestInbox,
  FriendSearchPanel,
  RealtimeConnectionStatusPanel,
  RoomAgentCommand,
  TauriCommunicationModePanel,
  VoiceSessionPanel,
  VoiceTokenSafetyPanel,
} from "@/features/communication/components";

const chatCacheSteps = [
  {
    description: "앱을 열면 기기 안 최근 메시지를 먼저 보여줍니다.",
    label: "로컬 캐시 표시",
    state: "valid" as const,
  },
  {
    description: "서버의 마지막 순서값과 비교해 빠진 메시지를 보충합니다.",
    label: "서버 메시지 보충",
    state: "stale" as const,
  },
  {
    description: "캐시가 비었거나 손상되면 서버 최근 메시지로 다시 만듭니다.",
    label: "캐시 복구",
    state: "rebuilding" as const,
  },
];

const communicationChannels = [
  {
    description: "친구와 바로 대화하고 프로젝트룸 초대 전 맥락을 맞춥니다.",
    label: "1:1 채팅",
    tone: "communication" as const,
  },
  {
    description: "프로젝트룸 자료, 작업, 확인 질문을 기준으로 멤버와 대화합니다.",
    label: "프로젝트룸 채팅",
    tone: "room" as const,
  },
  {
    description: "작업 맥락을 빠르게 맞춰야 할 때 같은 서버 연결로 보이스에 참여합니다.",
    label: "프로젝트룸 보이스",
    tone: "success" as const,
  },
];

const sharedConnections = [
  {
    description: "웹과 앱 모두 API 서버가 발급한 연결 정보만 사용합니다.",
    label: "같은 API 서버",
    status: "ready" as const,
  },
  {
    description: "LiveKit 연결 정보는 클라이언트에서 만들지 않습니다.",
    label: "서버 발급 보이스 토큰",
    status: "ready" as const,
  },
  {
    description: "Tauri 메인 화면에서 소통 탭을 숨겨도 버블과 전용 창은 같은 연결을 씁니다.",
    label: "앱 전용 소통 화면",
    status: "checking" as const,
  },
];

const voiceRules = [
  {
    description: "보이스 연결 정보는 서버에서 발급하고 내부 키는 클라이언트에 노출하지 않습니다.",
    label: "토큰 서버 발급",
    status: "safe" as const,
  },
  {
    description: "프로젝트룸 멤버 권한이 있는 사용자만 프로젝트룸 보이스에 참여합니다.",
    label: "멤버 권한 확인",
    status: "safe" as const,
  },
  {
    description: "녹음과 자동 회의록 생성은 소통 기능에 포함하지 않습니다.",
    label: "음성 저장 제외",
    status: "limited" as const,
  },
];

const voiceParticipants = [
  {
    canJoinVoice: true,
    label: "김정현",
    roleLabel: "프로젝트 리더",
    stateLabel: "참여 가능",
  },
  {
    canJoinVoice: true,
    label: "김미연",
    roleLabel: "멤버",
    stateLabel: "참여 가능",
  },
  {
    canJoinVoice: false,
    label: "초대 대기 사용자",
    roleLabel: "멤버 아님",
    stateLabel: "참여 불가",
  },
];

export default function ChatPage() {
  return (
    <>
      <PageHeading
        title="소통"
        description="친구, 1:1 채팅, 프로젝트룸 채팅, 보이스챗을 다루는 회원 웹 앱 화면입니다."
      />
      <div className="page-grid">
        <CommunicationPanel />
        <FriendSearchPanel />
        <FriendRequestInbox />
        <FriendInvitePanel />
        <ChatRoomListPanel />
        <ChatMessageComposer />
        <RoomAgentCommand />
        <ChatReadStatePanel />
        <ChatSequenceLoadingBoundaryPanel />
        <ChatCacheRecoveryPanel
          cacheStatus="stale"
          cachedCount={96}
          lastRoomSequence={128}
          roomLabel="K-Stay 프로젝트룸 채팅"
          serverSequence={132}
          steps={chatCacheSteps}
        />
        <RealtimeConnectionStatusPanel appMode="web" connectionState="CONNECTED" />
        <VoiceSessionPanel />
        <VoiceTokenSafetyPanel
          participants={voiceParticipants}
          roomLabel="K-Stay 프로젝트룸 보이스"
          rules={voiceRules}
          tokenEndpointLabel="API 서버에서 보이스 참여 정보를 발급"
        />
        <TauriCommunicationModePanel
          channels={communicationChannels}
          sharedConnections={sharedConnections}
          surface="tauri-window"
          webRoute="/app/chat"
        />
      </div>
    </>
  );
}
