import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import { RequireUser } from "./components/routing/RequireUser.tsx";
import { RouteFocusManager } from "./components/routing/RouteFocusManager.tsx";
import { LoadingState } from "./components/ui/LoadingState.tsx";

const App = lazy(() =>
  import("./app.tsx").then((module) => ({ default: module.App })),
);
const AppShell = lazy(() =>
  import("./components/layout/AppShell.tsx").then((module) => ({
    default: module.AppShell,
  })),
);
const AuthLayout = lazy(() =>
  import("./components/layout/AuthLayout.tsx").then((module) => ({
    default: module.AuthLayout,
  })),
);
const BookDetails = lazy(() =>
  import("./components/pages/BookDetails.tsx").then((module) => ({
    default: module.BookDetails,
  })),
);
const Dashboard = lazy(() =>
  import("./components/pages/Dashboard.tsx").then((module) => ({
    default: module.Dashboard,
  })),
);
const GoogleOAuthCallback = lazy(() =>
  import("./components/pages/GoogleOAuthCallback.tsx").then((module) => ({
    default: module.GoogleOAuthCallback,
  })),
);
const Library = lazy(() =>
  import("./components/pages/Library.tsx").then((module) => ({
    default: module.Library,
  })),
);
const Login = lazy(() =>
  import("./components/pages/Login.tsx").then((module) => ({
    default: module.Login,
  })),
);
const NotFound = lazy(() =>
  import("./components/pages/NotFound.tsx").then((module) => ({
    default: module.NotFound,
  })),
);
const Register = lazy(() =>
  import("./components/pages/Register.tsx").then((module) => ({
    default: module.Register,
  })),
);
const Search = lazy(() =>
  import("./components/pages/Search.tsx").then((module) => ({
    default: module.Search,
  })),
);

const pageFallback = <LoadingState label="Carregando página" />;

const queryClient = new QueryClient();
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RouteFocusManager />
        <Routes>
          <Route
            element={
              <Suspense fallback={pageFallback}>
                <AuthLayout />
              </Suspense>
            }
          >
            <Route
              path="/login"
              element={
                <Suspense fallback={pageFallback}>
                  <Login />
                </Suspense>
              }
            />
            <Route
              path="/register"
              element={
                <Suspense fallback={pageFallback}>
                  <Register />
                </Suspense>
              }
            />
          </Route>
          <Route
            path="/auth/google/callback"
            element={
              <Suspense fallback={pageFallback}>
                <GoogleOAuthCallback />
              </Suspense>
            }
          />

          <Route
            element={
              <Suspense fallback={pageFallback}>
                <AppShell>
                  <Suspense fallback={pageFallback}>
                    <Outlet />
                  </Suspense>
                </AppShell>
              </Suspense>
            }
          >
            <Route index element={<App />} />

            <Route element={<RequireUser />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="library" element={<Library />} />
              <Route path="library/:libraryId" element={<BookDetails />} />
              <Route path="search" element={<Search />} />
            </Route>
          </Route>

          <Route
            path="*"
            element={
              <Suspense fallback={pageFallback}>
                <NotFound />
              </Suspense>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
