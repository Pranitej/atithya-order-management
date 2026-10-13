"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "@/lib/api-client";
import type { LoginInput, RegisterInput } from "@/shared/schemas";
import type { UserDTO } from "@/shared/types";

const ME_KEY = ["auth", "me"] as const;

type UserReply = { user: UserDTO };

/** The signed-in user, or null for a visitor. Being signed out is not an error. */
async function getCurrentUser(): Promise<UserDTO | null> {
  try {
    return (await api.get<{ user: UserDTO | null }>("/auth/me")).user;
  } catch (error) {
    // The session had expired and could not be renewed.
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: getCurrentUser,
    staleTime: 60_000,
  });
}

/**
 * After the signed-in person changes, the cached "current user" is replaced
 * and any orders loaded for the previous person are thrown away.
 */
function useSessionChanged() {
  const queryClient = useQueryClient();
  return (user: UserDTO | null) => {
    queryClient.setQueryData(ME_KEY, user);
    queryClient.removeQueries({ queryKey: ["orders"] });
  };
}

export function useSignIn() {
  const sessionChanged = useSessionChanged();
  return useMutation({
    mutationFn: async (input: LoginInput) =>
      (await api.post<UserReply>("/auth/login", input)).user,
    onSuccess: sessionChanged,
  });
}

export function useRegister() {
  const sessionChanged = useSessionChanged();
  return useMutation({
    mutationFn: async (input: RegisterInput) =>
      (await api.post<UserReply>("/auth/register", input)).user,
    onSuccess: sessionChanged,
  });
}

export function useSignOut() {
  const sessionChanged = useSessionChanged();
  return useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSuccess: () => sessionChanged(null),
  });
}
