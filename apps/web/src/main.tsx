import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import { App } from "./app.tsx";
import { AppShell } from "./components/layout/AppShell.tsx";
import { AuthLayout } from "./components/layout/AuthLayout.tsx";
import { Dashboard } from "./components/pages/Dashboard.tsx";
import { Library } from "./components/pages/Library.tsx";
import { Login } from "./components/pages/Login.tsx";
import { NotFound } from "./components/pages/NotFound.tsx";
import { Register } from "./components/pages/Register.tsx";
import { Search } from "./components/pages/Search.tsx";
import { RequireUser } from "./components/routing/RequireUser.tsx";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          <Route
            element={
              <AppShell>
                <Outlet />
              </AppShell>
            }
          >
            <Route index element={<App />} />

            <Route element={<RequireUser />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="library" element={<Library />} />
              <Route path="search" element={<Search />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
