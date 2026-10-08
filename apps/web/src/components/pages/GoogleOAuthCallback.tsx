import type { PublicUser } from "@library/contracts";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router";
import { fetcher } from "../../lib/api";
import { ErrorState } from "../ui/ErrorState";
import { LoadingState } from "../ui/LoadingState";

export function GoogleOAuthCallback() {
  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => fetcher<PublicUser>("/auth/me"),
    retry: false,
  });

  if (meQuery.isPending) {
    return <LoadingState label="Confirmando sua sessão..." />;
  }

  if (meQuery.isError) {
    return (
      <ErrorState
        message={meQuery.error.message}
        onRetry={() => void meQuery.refetch()}
      />
    );
  }

  return <Navigate to="/dashboard" replace />;
}