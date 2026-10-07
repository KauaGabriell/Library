import { zodResolver } from "@hookform/resolvers/zod";
import {
  type PublicUser,
  type RegisterRequestInput,
  registerRequestSchema,
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

export function Register() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterRequestInput>({
    resolver: zodResolver(registerRequestSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterRequestInput) => {
      const response = await api.post<PublicUser>(
        "/auth/register",
        credentials,
      );
      return response.data;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["auth", "me"], user);
      navigate("/dashboard", { replace: true });
    },
  });

  function onSubmit(data: RegisterRequestInput) {
    registerMutation.mutate(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h2 className="sr-only">Criar conta</h2>
      <div className="mt-6 space-y-5">
        <div className="[&_label]:sr-only">
          <Input
            {...register("name")}
            label="Nome (opcional)"
            name="name"
            autoComplete="name"
            placeholder="Nome (opcional)"
            className={authInputClassName}
            error={errors.name?.message}
          />
        </div>

        <div className="[&_label]:sr-only">
          <Input
            {...register("email")}
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="E-mail"
            className={authInputClassName}
            error={errors.email?.message}
          />
        </div>

        <div>
          <div className="relative [&_label]:sr-only">
            <Input
              {...register("password")}
              label="Senha"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Senha"
              aria-describedby="register-password-hint"
              className={authInputClassName}
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
          <p
            id="register-password-hint"
            className="mt-2 text-xs text-text-secondary"
          >
            Use pelo menos 12 caracteres.
          </p>
        </div>
      </div>

      {registerMutation.isError && (
        <div
          role="alert"
          className="mt-4 flex items-center gap-2 rounded-lg border border-feedback-error/20 bg-feedback-error/5 px-3 py-2 text-xs leading-5 text-feedback-error"
        >
          <CircleAlert aria-hidden="true" size={15} className="shrink-0" />
          <span>{registerMutation.error.message}</span>
        </div>
      )}

      <Button
        type="submit"
        className="mt-5 w-full text-[0.625rem] tracking-[0.12em] uppercase shadow-sm"
        loading={registerMutation.isPending}
      >
        Criar conta
      </Button>
    </form>
  );
}
