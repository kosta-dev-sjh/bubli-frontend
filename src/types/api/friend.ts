export type FriendResponse = {
  acceptedAt?: string;
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
  bubliId: string;
};

export type FriendApiResponse = {
  acceptedAt: string;
  avatarUrl?: string | null;
  bubliId: string;
  name: string;
  userId: string;
};

export type FriendSearchApiResponse = {
  avatarUrl?: string | null;
  bubliId: string;
  id: string;
  name: string;
};

export type FriendRequestApiResponse = {
  createdAt: string;
  id: string;
  receiverBubliId: string;
  receiverId: string;
  receiverName: string;
  requesterBubliId: string;
  requesterId: string;
  requesterName: string;
  status: FriendRequestStatus;
};
