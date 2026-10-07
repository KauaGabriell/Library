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
import { api } from "../../lib/api";
import { authInputClassName } from "../auth/authFormStyles";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

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
      <h2 className="sr-only">Entrar</h2>
      <div className="mt-6 space-y-5">
        <div className="[&_label]:sr-only">
          <Input
            {...register("email")}
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="E-mail"
            className={authInputClassName}
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
            className={authInputClassName}
            loading={loginMutation.isPending}
            error={errors.password?.message}
          />
          <button
            type="button"
            aria-label="Alternar visibilidade da senha"
            aria-pressed={showPassword}
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute top-1/2 right-0 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-text-muted transition-colors hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary motion-reduce:transition-none"
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
        <span className="text-(--color-brand-primary)">Esqueci a senha</span>
      </div>

      <Button
        type="submit"
        className="mt-5 w-full text-[0.625rem] tracking-[0.12em] uppercase shadow-sm"
      >
        Entrar
      </Button>
    </form>
  );
}
