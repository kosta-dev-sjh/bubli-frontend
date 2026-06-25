export type FriendResponse = {
  avatarUrl?: string | null;
  bubliId: string;
  friendUserId: string;
  name: string;
};

export type FriendSearchResponse = {
  avatarUrl?: string | null;
  bubliId: string;
  name: string;
  userId: string;
};

export type FriendRequestDirection = "RECEIVED" | "SENT";

export type FriendRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELED";

export type FriendRequestResponse = {
  createdAt: string;
  direction: FriendRequestDirection;
  id: string;
  receiver: FriendSearchResponse;
  requester: FriendSearchResponse;
  status: FriendRequestStatus;
};

export type FriendRequestCreateRequest = {
  receiverUserId: string;
};
