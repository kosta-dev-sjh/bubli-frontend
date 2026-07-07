export const websocketTopics = {
  chatRoom: (chatRoomId: string) => `/topic/chat/${chatRoomId}`,
  projectRoomEvents: (roomId: string) => `/topic/project-rooms/${roomId}/events`,
  voiceRoom: (voiceRoomId: string) => `/topic/voice/${voiceRoomId}`,
  notifications: "/user/queue/notifications",
} as const;
