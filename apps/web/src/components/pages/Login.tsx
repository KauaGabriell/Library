import { zodResolver } from "@hookform/resolvers/zod";
import {
  type loginRequestInput,
  loginRequestSchema,
  type PublicUser,
} from "@library/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import libraryBackground from "../../assets/libraryBackground.jpg";
import { api } from "../../lib/api";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

const fieldClassName =
  "rounded-field border border-b border-[var(--color-border-default)] bg-[var(--color-background-surface)] text-sm placeholder:text-[var(--color-text-muted)] focus-visible:border-[var(--color-brand-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)]/20";

export function Login() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<loginRequestInput>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: loginRequestInput) => {
      const response = await api.post<PublicUser>("/auth/login", credentials);
      return response.data;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["auth", "me"], user);
      navigate("/dashboard", { replace: true });
    },
  });
  function onSubmit(data: loginRequestInput) {
    loginMutation.mutate(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <main className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-(--color-text-primary) px-4 py-8 sm:px-6">
        <img
          src={libraryBackground}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
        />
        <div
          className="absolute inset-0 -z-10 bg-black/60"
          aria-hidden="true"
        />

        <section
          aria-labelledby="login-title"
          className="w-full max-w-108.5 rounded-card border border-border-default/60 bg-background-canvas px-6 py-9 shadow-2xl sm:px-10 sm:py-10"
        >
          <h1
            id="login-title"
            className="font-heading text-display leading-none font-semibold tracking-tight text-(--color-brand-primary)"
          >
            Literaria
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            Sua jornada literária começa aqui.
          </p>

          <div className="mt-8 grid grid-cols-2 border-b border-border-default/40 text-center text-[0.625rem] font-bold tracking-[0.12em] uppercase">
            <span className="border-b-2 border-(--color-brand-primary) pb-3 text-(--color-brand-primary)">
              Entrar
            </span>
            <span className="pb-3 text-text-muted">Criar conta</span>
          </div>

          <div className="mt-6 space-y-5">
            <div className="[&_label]:sr-only">
              <Input
                {...register("email")}
                label="E-mail"
                name="email"
                type={"email"}
                autoComplete="email"
                placeholder="E-mail"
                className={fieldClassName}
                loading={loginMutation.isPending}
                error={errors.email?.message}
              />
            </div>

            <div className="relative [&_label]:sr-only">
              <Input
                {...register("password")}
                label="Senha"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Senha"
                className={fieldClassName}
                loading={loginMutation.isPending}
                error={errors.password?.message}
              />
              <button
                type="button"
                aria-label="Alternar visibilidade da senha"
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
                className="cursor-pointer absolute top-1/2 right-0 flex size-10 -translate-y-1/2 items-center justify-center rounded text-text-muted transition-colors hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary motion-reduce:transition-none"
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" size={16} strokeWidth={1.8} />
                ) : (
                  <Eye aria-hidden="true" size={16} strokeWidth={1.8} />
                )}
              </button>
            </div>
          </div>
          {loginMutation.isError && (
            <div
              role="alert"
              className="mt-4 flex items-center gap-2 rounded-lg border border-feedback-error/20 bg-feedback-error/5 px-3 py-2 text-xs leading-5 text-feedback-error"
            >
              <CircleAlert aria-hidden="true" size={15} className="shrink-0" />
              <span>{loginMutation.error.message}</span>
            </div>
          )}
          <div className="mt-5 flex items-center justify-between gap-3 text-sm">
            <label className="inline-flex items-center gap-2 text-text-secondary">
              <input
                type="checkbox"
                name="remember"
                className="size-3.5 rounded border border-border-default accent-(--color-brand-primary)"
              />
              Lembrar-me
            </label>
            <span className="text-(--color-brand-primary)">
              Esqueci a senha
            </span>
          </div>

          <Button
            type="submit"
            className="mt-5 w-full text-[0.625rem] tracking-[0.12em] uppercase shadow-sm"
          >
            Entrar
          </Button>

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
        </section>
      </main>
    </form>
  );
}
