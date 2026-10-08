import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { BookOpen, LayoutGrid, LogOut, Menu, Search, X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import { api } from "../../lib/api";
import { Button } from "../ui/Button";
import { ErrorState } from "../ui/ErrorState";

const navigationItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/search", label: "Buscar livros", icon: Search },
  { href: "/library", label: "Minha biblioteca", icon: BookOpen },
];

type AppShellProps = {
  children: ReactNode;
};

type NavigationLinksProps = {
  onNavigate?: () => void;
};

function NavigationLinks({ onNavigate }: NavigationLinksProps) {
  const reducedMotion = useReducedMotion();

  return (
    <LayoutGroup id="primary-navigation">
      <ul className="flex flex-col gap-2">
        {navigationItems.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <NavLink
              to={href}
              onClick={onNavigate}
              className={({ isActive }) =>
                `relative isolate flex min-h-11 items-center gap-3 rounded-r-field px-3 py-2 text-body-sm font-semibold transition-colors duration-150 ease-out motion-reduce:transition-none ${isActive ? "text-brand-primary" : "text-text-secondary hover:bg-background-surface hover:text-text-primary"}`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      {...{
                        layoutId: "active-navigation-item",
                        transition: {
                          duration: reducedMotion ? 0 : 0.2,
                          ease: "easeOut",
                        },
                      }}
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-r-field border-r-[3px] border-brand-primary bg-background-surface"
                    />
                  )}
                  <Icon
                    aria-hidden="true"
                    focusable="false"
                    className={`relative z-10 size-5 shrink-0 ${isActive ? "text-brand-primary" : ""}`}
                    strokeWidth={1.8}
                  />
                  <span className="relative z-10">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </LayoutGroup>
  );
}

function Brand() {
  return (
    <Link
      to="/dashboard"
      className="flex flex-col font-heading text-heading-md font-semibold leading-tight tracking-tight text-brand-primary focus-visible:rounded-sm lg:text-[2.25rem]"
    >
      Literaria
      <span className="font-interface text-label-sm font-normal tracking-normal text-text-muted lg:text-body-md">
        Biblioteca Pessoal
      </span>
    </Link>
  );
}

export function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const logoutMutation = useMutation({
    mutationFn: async () => api.post("/auth/logout"),
    onSuccess: () => {
      queryClient.clear();
      navigate("/login", { replace: true });
    },
  });

  function handleLogout() {
    logoutMutation.mutate();
  }

  useEffect(() => {
    if (!menuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="grid min-h-dvh w-full bg-background-canvas text-text-primary lg:grid-cols-[16rem_minmax(0,1fr)]">
      <header className="relative z-10 border-b border-border-default bg-background-canvas lg:flex lg:min-h-dvh lg:flex-col lg:border-b-0 lg:border-r lg:px-4 lg:py-8">
        <div className="flex min-h-16 items-center gap-4 px-4 sm:px-6 lg:mb-8 lg:min-h-0 lg:px-4">
          <button
            ref={menuButtonRef}
            type="button"
            aria-label={
              menuOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"
            }
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((isOpen) => !isOpen)}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-field border border-border-default text-text-primary hover:bg-background-surface lg:hidden"
          >
            {menuOpen ? (
              <X aria-hidden="true" className="size-5" strokeWidth={1.8} />
            ) : (
              <Menu aria-hidden="true" className="size-5" strokeWidth={1.8} />
            )}
          </button>
          <Brand />
        </div>
        <nav
          id={menuId}
          aria-label="Navegação principal"
          className={`${menuOpen ? "block" : "hidden"} border-t border-border-default bg-background-canvas px-4 py-3 sm:px-6 lg:flex lg:flex-1 lg:flex-col lg:border-t-0 lg:px-0 lg:py-0`}
        >
          <NavigationLinks onNavigate={closeMenu} />
          <div className="mt-6 border-t border-border-default pt-3 lg:mt-auto">
            <Button
              loading={logoutMutation.isPending}
              type="button"
              onClick={handleLogout}
              variant="ghost"
              className="flex min-h-11 w-full items-center justify-between gap-3 rounded-field px-3 py-2 text-body-sm text-text-muted disabled:cursor-not-allowed cursor-pointer hover:bg-background-surface hover:border-r-3 hover:border-r-brand-primary"
            >
              <LogOut
                aria-hidden="true"
                className="size-5 shrink-0"
                strokeWidth={1.8}
              />
              <span>Sair</span>
            </Button>
            {logoutMutation.isError && (
              <ErrorState
                message={logoutMutation.error.message}
                onRetry={handleLogout}
              />
            )}
          </div>
        </nav>
      </header>

      <main id="main-content" className="min-w-0 bg-background-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:px-12 lg:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
