import { apiRequest } from "@/lib/api/client";
import type {
  FriendRequestCreateRequest,
  FriendRequestResponse,
  FriendResponse,
  FriendSearchResponse,
} from "@/types/api/friend";

export const friendApi = {
  listFriends() {
    return apiRequest<FriendResponse[]>("/api/friends");
  },

  searchByBubliId(bubliId: string) {
    const query = new URLSearchParams({ bubliId }).toString();
    return apiRequest<FriendSearchResponse[]>(`/api/friends/search?${query}`);
  },

  listRequests() {
    return apiRequest<FriendRequestResponse[]>("/api/friend-requests");
  },

  sendRequest(body: FriendRequestCreateRequest) {
    return apiRequest<FriendRequestResponse>("/api/friend-requests", {
      body,
      method: "POST",
    });
  },

  acceptRequest(requestId: string) {
    return apiRequest<FriendRequestResponse>(`/api/friend-requests/${requestId}/accept`, {
      method: "PATCH",
    });
  },

  rejectRequest(requestId: string) {
    return apiRequest<FriendRequestResponse>(`/api/friend-requests/${requestId}/reject`, {
      method: "PATCH",
    });
  },

  deleteFriend(friendUserId: string) {
    return apiRequest<null>(`/api/friends/${friendUserId}`, {
      method: "DELETE",
    });
  },
} as const;
