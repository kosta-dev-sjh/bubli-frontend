import type { AuthUser } from "@/types/api/auth";

export function authUserDisplayName(user: AuthUser) {
  return user.name.trim() || user.bubliId;
}

export function authUserAccountLabel(user: AuthUser) {
  if (user.email?.trim()) {
    return user.email;
  }

  return `@${user.bubliId}`;
}
