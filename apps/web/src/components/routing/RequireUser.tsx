import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router";
import { fetcher } from "../../lib/api";
import { ApiClientError } from "../../lib/apiError";
import { ErrorState } from "../ui/ErrorState";
import { LoadingState } from "../ui/LoadingState";

export function RequireUser() {
  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => await fetcher("/auth/me"),
    retry: false,
  });
  if (meQuery.isPending) {
    return <LoadingState label="Verificando sua sessão..." />;
  }

  if (
    meQuery.isError &&
    meQuery.error instanceof ApiClientError &&
    meQuery.error.statusCode === 401
  ) {
    return <Navigate to={"/login"} replace />;
  }

  if (meQuery.error) {
    return (
      <ErrorState
        message={meQuery.error.message}
        onRetry={() => {
          void meQuery.refetch();
        }}
      />
    );
  }

  return <Outlet />;
}
