export const websocketTopics = {
  chatRoom: (chatRoomId: string) => `/topic/chat/${chatRoomId}`,
  projectRoomEvents: (roomId: string) => `/topic/project-rooms/${roomId}/events`,
  notifications: "/user/queue/notifications",
} as const;
