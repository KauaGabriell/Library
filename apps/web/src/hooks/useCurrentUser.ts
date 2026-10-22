import type { PublicUser } from "@library/contracts";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "../lib/api";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => fetcher<PublicUser>("/auth/me"),
    retry: false,
  });
}
