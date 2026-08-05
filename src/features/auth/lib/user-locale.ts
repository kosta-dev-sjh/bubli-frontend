"use client";

import { authApi } from "@/features/auth/api/authApi";
import { updateStoredAuthSessionUser } from "@/lib/auth/auth-session";
import { notifyUserUpdated } from "@/lib/data-changed";
import type { Locale } from "@/lib/i18n";
import type { AuthUser } from "@/types/api/auth";

export async function saveAuthUserLocale(user: AuthUser, locale: Locale) {
  const optimisticUser: AuthUser = { ...user, locale };
  updateStoredAuthSessionUser(optimisticUser);
  notifyUserUpdated(optimisticUser);

  try {
    const savedUser = await authApi.updateMe({ locale });
    updateStoredAuthSessionUser(savedUser);
    notifyUserUpdated(savedUser);
    return savedUser;
  } catch (error) {
    updateStoredAuthSessionUser(user);
    notifyUserUpdated(user);
    throw error;
  }
}
