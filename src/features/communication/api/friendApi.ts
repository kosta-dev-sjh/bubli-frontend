import { authApi } from "@/features/auth/api/authApi";
import { apiRequest } from "@/lib/api/client";
import { ApiClientError } from "@/lib/api/errors";
import { getStoredAuthSession } from "@/lib/auth/auth-session";
import { isWindowsTauriRuntime } from "@/lib/tauri/platform";
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

async function resolveCurrentUserIdForFriendRequest() {
  if (isWindowsTauriRuntime()) {
    const userId = getStoredAuthSession()?.user?.id;
    if (userId) return userId;
  }

  return (await authApi.getMe()).id;
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
    const [currentUserId, requests] = await Promise.all([
      resolveCurrentUserIdForFriendRequest(),
      apiRequest<FriendRequestApiResponse[]>("/api/friend-requests"),
    ]);
    return requests.map((request) => toFriendRequest(request, currentUserId));
  },

  async sendRequest(body: FriendRequestCreateRequest) {
    const [currentUserId, request] = await Promise.all([
      resolveCurrentUserIdForFriendRequest(),
      apiRequest<FriendRequestApiResponse>("/api/friend-requests", {
        body,
        method: "POST",
      }),
    ]);
    return toFriendRequest(request, currentUserId);
  },

  async acceptRequest(requestId: string) {
    const [currentUserId, request] = await Promise.all([
      resolveCurrentUserIdForFriendRequest(),
      apiRequest<FriendRequestApiResponse>(`/api/friend-requests/${requestId}/accept`, {
        method: "PATCH",
      }),
    ]);
    return toFriendRequest(request, currentUserId);
  },

  async rejectRequest(requestId: string) {
    const [currentUserId, request] = await Promise.all([
      resolveCurrentUserIdForFriendRequest(),
      apiRequest<FriendRequestApiResponse>(`/api/friend-requests/${requestId}/reject`, {
        method: "PATCH",
      }),
    ]);
    return toFriendRequest(request, currentUserId);
  },

  deleteFriend(friendUserId: string) {
    return apiRequest<null>(`/api/friends/${friendUserId}`, {
      method: "DELETE",
    });
  },
} as const;
