import { type ReactNode, useEffect, useId, useRef, useState } from "react";

const navigationItems = [
  { href: "/dashboard", label: "Painel" },
  { href: "/library", label: "Biblioteca" },
  { href: "/search", label: "Buscar livros" },
];

type AppShellProps = {
  children: ReactNode;
  activeHref?: string;
};

function NavigationLinks({
  activeHref,
  onNavigate,
}: {
  activeHref: string;
  onNavigate?: () => void;
}) {
  return (
    <ul className="flex flex-col gap-1">
      {navigationItems.map(({ href, label }) => {
        const isActive =
          activeHref === href || activeHref.startsWith(`${href}/`);

        return (
          <li key={href}>
            <a
              href={href}
              aria-current={isActive ? "page" : undefined}
              onClick={onNavigate}
              className={`block min-h-11 border-l-2 px-3 py-2 text-body-sm font-semibold transition-colors motion-reduce:transition-none ${isActive ? "border-l-brand-primary bg-background-surface text-text-primary" : "border-l-transparent text-text-secondary hover:bg-background-surface hover:text-text-primary"}`}
            >
              {label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function AppShell({ children, activeHref = "/" }: AppShellProps) {
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
          <a
            href="/dashboard"
            className="font-heading text-heading-md font-semibold tracking-tight"
          >
            Literaria
          </a>
          <span className="ml-auto hidden text-label-sm text-text-muted sm:block">
            Sua biblioteca, no seu ritmo
          </span>
        </div>
        <nav
          id={menuId}
          aria-label="Navegação principal"
          className={`${menuOpen ? "block" : "hidden"} border-t border-border-default bg-background-canvas px-4 py-3 md:px-6 lg:hidden`}
        >
          <NavigationLinks activeHref={activeHref} onNavigate={closeMenu} />
        </nav>
      </header>

      <div className="grid min-h-[calc(100vh-4rem)] w-full lg:grid-cols-[12.5rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-border-default bg-background-subtle px-4 py-8 lg:block">
          <nav aria-label="Navegação principal">
            <NavigationLinks activeHref={activeHref} />
          </nav>
        </aside>
        <main id="main-content" className="min-w-0">
          <div className="mx-auto w-full max-w-[80rem] px-4 py-8 md:px-6 lg:px-12 lg:py-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
