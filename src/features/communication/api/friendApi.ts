import { authApi } from "@/features/auth/api/authApi";
import { apiRequest } from "@/lib/api/client";
import { ApiClientError } from "@/lib/api/errors";
import type {
  FriendApiResponse,
  FriendRequestApiResponse,
  FriendRequestCreateRequest,
  FriendRequestResponse,
  FriendResponse,
  FriendSearchApiResponse,
  FriendSearchResponse,
} from "@/types/api/friend";

function toFriend(response: FriendApiResponse): FriendResponse {
  return {
    acceptedAt: response.acceptedAt,
    avatarUrl: response.avatarUrl,
    bubliId: response.bubliId,
    friendUserId: response.userId,
    name: response.name,
  };
}

function toFriendSearch(response: FriendSearchApiResponse): FriendSearchResponse {
  return {
    avatarUrl: response.avatarUrl,
    bubliId: response.bubliId,
    name: response.name,
    userId: response.id,
  };
}

function toFriendRequest(response: FriendRequestApiResponse, currentUserId: string): FriendRequestResponse {
  return {
    createdAt: response.createdAt,
    direction: response.requesterId === currentUserId ? "SENT" : "RECEIVED",
    id: response.id,
    receiver: {
      bubliId: response.receiverBubliId,
      name: response.receiverName,
      userId: response.receiverId,
    },
    requester: {
      bubliId: response.requesterBubliId,
      name: response.requesterName,
      userId: response.requesterId,
    },
    status: response.status,
  };
}

export const friendApi = {
  async listFriends() {
    const friends = await apiRequest<FriendApiResponse[]>("/api/friends");
    return friends.map(toFriend);
  },

  async searchByBubliId(bubliId: string) {
    const query = new URLSearchParams({ bubliId }).toString();
    try {
      const result = await apiRequest<FriendSearchApiResponse>(`/api/friends/search?${query}`);
      return [toFriendSearch(result)];
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) {
        return [];
      }
      throw error;
    }
  },

  async listRequests() {
    const [me, requests] = await Promise.all([
      authApi.getMe(),
      apiRequest<FriendRequestApiResponse[]>("/api/friend-requests"),
    ]);
    return requests.map((request) => toFriendRequest(request, me.id));
  },

  async sendRequest(body: FriendRequestCreateRequest) {
    const [me, request] = await Promise.all([
      authApi.getMe(),
      apiRequest<FriendRequestApiResponse>("/api/friend-requests", {
        body,
        method: "POST",
      }),
    ]);
    return toFriendRequest(request, me.id);
  },

  async acceptRequest(requestId: string) {
    const [me, request] = await Promise.all([
      authApi.getMe(),
      apiRequest<FriendRequestApiResponse>(`/api/friend-requests/${requestId}/accept`, {
        method: "PATCH",
      }),
    ]);
    return toFriendRequest(request, me.id);
  },

  async rejectRequest(requestId: string) {
    const [me, request] = await Promise.all([
      authApi.getMe(),
      apiRequest<FriendRequestApiResponse>(`/api/friend-requests/${requestId}/reject`, {
        method: "PATCH",
      }),
    ]);
    return toFriendRequest(request, me.id);
  },

  deleteFriend(friendUserId: string) {
    return apiRequest<null>(`/api/friends/${friendUserId}`, {
      method: "DELETE",
    });
  },
} as const;
