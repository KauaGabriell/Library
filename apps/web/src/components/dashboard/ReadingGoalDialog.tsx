import { zodResolver } from "@hookform/resolvers/zod";
import { type ReadingGoalInput, readingGoalSchema } from "@library/contracts";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, Trash2, X } from "lucide-react";
import { type ReactElement, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { api } from "../../lib/api";
import { Button } from "../ui/Button";
import { ErrorState } from "../ui/ErrorState";
import { Input } from "../ui/Input";

type ReadingGoalDialogProps = {
  trigger: ReactElement;
  mode?: "create" | "edit";
  initialTargetBooks?: number;
};

export function ReadingGoalDialog({
  trigger,
  mode = "create",
  initialTargetBooks = 1,
}: ReadingGoalDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const inputHintId = useId();
  const isEditing = mode === "edit";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReadingGoalInput>({
    resolver: zodResolver(readingGoalSchema),
    defaultValues: {
      targetBooks: initialTargetBooks,
    },
  });

  const saveGoalMutation = useMutation({
    mutationFn: async (targetBooks: ReadingGoalInput) => {
      const response = await api.put("/reading-goal", targetBooks);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete("/reading-goal");
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      saveGoalMutation.reset();
      deleteGoalMutation.reset();
    }
  }

  function onDelete() {
    deleteGoalMutation.mutate();
  }

  function onSubmit(data: ReadingGoalInput) {
    saveGoalMutation.mutate(data);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-dialog border border-border-default bg-background-canvas text-text-primary outline-none">
          <header className="flex items-start justify-between gap-5 border-b border-border-default px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-1">
              <DialogPrimitive.Title className="font-heading text-heading-md">
                {isEditing
                  ? "Editar meta de leitura"
                  : "Definir meta de leitura"}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm leading-relaxed text-text-secondary">
                {isEditing
                  ? "Ajuste sua meta anual e acompanhe seu progresso no painel."
                  : "Escolha quantos livros quer ler e acompanhe seu progresso no painel."}
              </DialogPrimitive.Description>
            </div>

            <DialogPrimitive.Close asChild>
              <button
                type="button"
                aria-label="Fechar diálogo"
                className="flex size-11 shrink-0 items-center justify-center rounded-field text-text-secondary transition-colors hover:bg-background-surface hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary motion-reduce:transition-none"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </DialogPrimitive.Close>
          </header>

          <form
            noValidate
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-7 p-5 sm:p-6"
          >
            <div className="flex flex-col gap-2">
              <Input
                label="Livros que deseja ler"
                type="number"
                inputMode="numeric"
                step={1}
                placeholder="Ex.: 12"
                aria-describedby={inputHintId}
                className="pr-3"
                loading={saveGoalMutation.isPending}
                disabled={saveGoalMutation.isPending}
                error={errors.targetBooks?.message}
                {...register("targetBooks", { valueAsNumber: true })}
              />
              <p
                id={inputHintId}
                className="text-sm leading-relaxed text-text-secondary"
              >
                Escolha uma quantidade que combine com seu ritmo de leitura.
              </p>
            </div>
            {saveGoalMutation.isError && (
              <div
                role="alert"
                className="mt-4 flex items-center gap-2 rounded-lg border border-feedback-error/20 bg-feedback-error/5 px-3 py-2 text-xs leading-5 text-feedback-error"
              >
                <CircleAlert
                  aria-hidden="true"
                  size={15}
                  className="shrink-0"
                />
                <span>{saveGoalMutation.error.message}</span>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-border-default pt-5 sm:flex-row sm:items-center">
              {isEditing && (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full whitespace-nowrap border-feedback-error/40 text-feedback-error transition-colors enabled:hover:border-feedback-error enabled:hover:bg-feedback-error/5 enabled:hover:text-feedback-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-feedback-error sm:w-auto"
                  disabled={
                    saveGoalMutation.isPending || deleteGoalMutation.isPending
                  }
                  onClick={onDelete}
                  loading={deleteGoalMutation.isPending}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  Remover meta
                </Button>
              )}
              {deleteGoalMutation.isError && (
                <ErrorState
                  message={deleteGoalMutation.error.message}
                  onRetry={onDelete}
                />
              )}
              <div className="flex flex-col-reverse gap-3 sm:ml-auto sm:flex-row">
                <DialogPrimitive.Close asChild>
                  <Button
                    variant="secondary"
                    className="w-full whitespace-nowrap sm:w-auto"
                  >
                    Cancelar
                  </Button>
                </DialogPrimitive.Close>
                <Button
                  type="submit"
                  className="w-full whitespace-nowrap sm:w-auto"
                  loading={saveGoalMutation.isPending}
                >
                  {isEditing ? "Salvar alterações" : "Salvar meta"}
                </Button>
              </div>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
