import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Link, NavLink } from "react-router";

const navigationItems = [
  {
    href: "/dashboard",
    label: "Painel",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
  },
  {
    href: "/library",
    label: "Biblioteca",
    icon: (
      <path d="M12 5v15M12 5C9 3 6 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Z" />
    ),
  },
  {
    href: "/search",
    label: "Buscar livros",
    icon: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
  },
];

type AppShellProps = {
  children: ReactNode;
};

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <ul className="flex flex-col gap-1">
      {navigationItems.map(({ href, label, icon }) => {
        return (
          <li key={href}>
            <NavLink
              to={href}
              onClick={onNavigate}
              className={({ isActive }) =>
                `group flex min-h-11 items-center gap-3 rounded-r-field border-l-2 px-3 py-2 text-body-sm font-semibold transition-colors duration-200 ease-out motion-reduce:transition-none ${isActive ? "border-l-brand-primary bg-text-primary/8 text-text-primary" : "border-l-transparent text-text-secondary hover:bg-text-primary/4 hover:text-text-primary focus-visible:bg-text-primary/4 focus-visible:text-text-primary"}`
              }
            >
              {({ isActive }) => (
                <>
                  <svg
                    aria-hidden="true"
                    focusable="false"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`size-5 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 motion-reduce:transform-none motion-reduce:translate-none motion-reduce:transition-none ${isActive ? "text-brand-primary" : ""}`}
                  >
                    {icon}
                  </svg>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        );
      })}
    </ul>
  );
}

export function AppShell({ children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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
    <div className="min-h-screen bg-background-canvas text-text-primary">
      <header className="relative z-10 border-b border-border-default bg-background-canvas">
        <div className="mx-auto flex min-h-16 max-w-[100rem] items-center gap-4 px-4 md:px-6 lg:px-12">
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
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="size-5"
            >
              {menuOpen ? (
                <path d="m6 6 12 12M18 6 6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
          <Link
            to="/dashboard"
            className="font-heading text-heading-md font-semibold tracking-tight"
          >
            Literaria
          </Link>
          <span className="ml-auto hidden text-label-sm text-text-muted sm:block">
            Sua biblioteca, no seu ritmo
          </span>
        </div>
        <nav
          id={menuId}
          aria-label="Navegação principal"
          className={`${menuOpen ? "block" : "hidden"} border-t border-border-default bg-background-canvas px-4 py-3 md:px-6 lg:hidden`}
        >
          <NavigationLinks onNavigate={closeMenu} />
        </nav>
      </header>

      <div className="grid min-h-[calc(100vh-4rem)] w-full lg:grid-cols-[12.5rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-border-default bg-background-subtle px-4 py-8 lg:block">
          <nav aria-label="Navegação principal">
            <NavigationLinks />
          </nav>
        </aside>
        <main id="main-content" className="min-w-0">
          <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:px-12 lg:py-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
