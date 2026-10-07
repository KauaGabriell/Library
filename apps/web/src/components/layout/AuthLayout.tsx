import { motion, useReducedMotion } from "framer-motion";
import { NavLink, useLocation, useOutlet } from "react-router";
import libraryBackground from "../../assets/libraryBackground.jpg";
import { Button } from "../ui/Button";
import { TransitionPanel } from "../ui/TransitionPanel";

const tabClassName = (active: boolean) =>
  `flex min-h-11 items-center justify-center transition-colors focus-visible:rounded-sm motion-reduce:transition-none ${
    active ? "text-brand-primary" : "text-text-muted hover:text-brand-primary"
  }`;

export function AuthLayout() {
  const { pathname } = useLocation();
  const outlet = useOutlet();
  const activeIndex = pathname === "/register" ? 1 : 0;
  const reducedMotion = useReducedMotion();

  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-(--color-text-primary) px-4 py-8 sm:px-6">
      <img
        src={libraryBackground}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 -z-10 bg-black/60" aria-hidden="true" />

      <motion.section
        layout={!reducedMotion}
        transition={{ layout: { duration: 0.26, ease: "easeOut" } }}
        aria-labelledby="auth-title"
        className="w-full max-w-108.5 rounded-card border border-border-default/60 bg-background-canvas px-6 py-9 shadow-2xl sm:px-10 sm:py-10"
      >
        <h1
          id="auth-title"
          className="font-heading text-display leading-none font-semibold tracking-tight text-(--color-brand-primary)"
        >
          Literaria
        </h1>
        <p className="mt-3 text-sm text-text-secondary">
          Sua jornada literária começa aqui.
        </p>

        <nav
          aria-label="Autenticação"
          className="relative mt-8 grid grid-cols-2 border-b border-border-default/40 text-center text-[0.625rem] font-bold tracking-[0.12em] uppercase"
        >
          <NavLink
            to="/login"
            className={({ isActive }) => tabClassName(isActive)}
          >
            Entrar
          </NavLink>
          <NavLink
            to="/register"
            className={({ isActive }) => tabClassName(isActive)}
          >
            Criar conta
          </NavLink>
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-0 h-0.5 w-1/2 bg-brand-primary"
            animate={{ x: activeIndex === 1 ? "100%" : "0%" }}
            transition={{ duration: reducedMotion ? 0 : 0.26, ease: "easeOut" }}
          />
        </nav>

        <TransitionPanel
          activeKey={pathname}
          direction={activeIndex === 1 ? 1 : -1}
        >
          {outlet}
        </TransitionPanel>

        <div className="mt-9 flex items-center gap-3 text-xs text-text-muted">
          <span className="h-px flex-1 bg-border-default/40" />
          <span>OU</span>
          <span className="h-px flex-1 bg-border-default/40" />
        </div>

        <Button
          variant="secondary"
          className="mt-4 w-full bg-background-canvas text-xs font-normal"
        >
          <span
            aria-hidden="true"
            className="bg-[conic-gradient(from_-45deg,#4285f4_0deg_90deg,#34a853_90deg_160deg,#fbbc05_160deg_240deg,#ea4335_240deg_315deg,#4285f4_315deg_360deg)] bg-clip-text text-base leading-none font-bold text-transparent"
          >
            G
          </span>
          Continuar com Google
        </Button>

        <p className="mt-6 text-center text-xs leading-relaxed text-text-muted">
          Ao continuar, você concorda com nossos <u>Termos de Serviço</u> e{" "}
          <u>Política de Privacidade</u>.
        </p>
      </motion.section>
    </main>
  );
}
