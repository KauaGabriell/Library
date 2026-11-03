import {
  type EnrichedRecommendationResponse,
  type RecommendationQuizRequest,
  recommendationQuizRequestSchema,
} from "@library/contracts";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useRecommendationQuiz } from "../../hooks/useRecommendationQuiz";
import { api } from "../../lib/api";
import {
  type RecommendationQuizStep,
  recommendationQuizSteps,
} from "../recommendations/recommendationQuizSteps";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { ErrorState } from "../ui/ErrorState";

const quizQuestionCount = recommendationQuizSteps.length;

export function RecommendationQuiz() {
  const {
    draft,
    currentStepIndex,
    setCurrentStepIndex,
    updateAnswer,
    updateAdditionalContext,
  } = useRecommendationQuiz();
  const [stepError, setStepError] = useState<string>();
  const [lastSubmittedPayload, setLastSubmittedPayload] =
    useState<RecommendationQuizRequest>();
  const [recommendationResult, setRecommendationResult] =
    useState<EnrichedRecommendationResponse>();
  const recommendationMutation = useMutation({
    mutationFn: async (payload: RecommendationQuizRequest) => {
      const response = await api.post<EnrichedRecommendationResponse>(
        "/recommendations",
        payload,
      );

      return response.data;
    },
    onSuccess: (response) => setRecommendationResult(response),
  });
  const step = recommendationQuizSteps[currentStepIndex];
  const progressValue = Math.min(currentStepIndex + 1, quizQuestionCount);
  const progressPercent = (progressValue / quizQuestionCount) * 100;

  function clearFailedSubmission() {
    if (recommendationMutation.isError) {
      recommendationMutation.reset();
      setLastSubmittedPayload(undefined);
    }
  }

  function validateCurrentAnswer(currentStep: RecommendationQuizStep) {
    const result = recommendationQuizRequestSchema.shape[
      currentStep.field
    ].safeParse(draft[currentStep.field]);

    if (result.success) {
      setStepError(undefined);
      return true;
    }

    setStepError(
      currentStep.selectionMode === "multiple"
        ? "Selecione pelo menos uma opção."
        : "Selecione uma opção para continuar.",
    );
    return false;
  }

  function handleContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (recommendationMutation.isPending) return;
    if (!step || !validateCurrentAnswer(step)) return;

    if (currentStepIndex === quizQuestionCount - 1) {
      const result = recommendationQuizRequestSchema.safeParse(draft);

      if (!result.success) {
        const invalidField = result.error.issues[0]?.path[0];
        const invalidStepIndex = recommendationQuizSteps.findIndex(
          (quizStep) => quizStep.field === invalidField,
        );

        if (invalidStepIndex >= 0) setCurrentStepIndex(invalidStepIndex);
        setStepError("Revise as respostas antes de enviar o quiz.");
        return;
      }

      setStepError(undefined);
      setLastSubmittedPayload(result.data);
      recommendationMutation.mutate(result.data);
      return;
    }

    setCurrentStepIndex((index) => index + 1);
  }

  function handleBack() {
    setStepError(undefined);
    setCurrentStepIndex((index) => Math.max(0, index - 1));
  }

  function handleEditAnswers() {
    setRecommendationResult(undefined);
    setLastSubmittedPayload(undefined);
    setStepError(undefined);
    setCurrentStepIndex(0);
  }

  function handleRetry() {
    if (lastSubmittedPayload && !recommendationMutation.isPending) {
      recommendationMutation.mutate(lastSubmittedPayload);
    }
  }

  function handleMultipleChoiceChange(
    currentStep: Extract<RecommendationQuizStep, { selectionMode: "multiple" }>,
    optionValue: string,
  ) {
    const selectedValues = Array.isArray(draft[currentStep.field])
      ? (draft[currentStep.field] as string[])
      : [];
    let nextValues: string[];

    if (selectedValues.includes(optionValue)) {
      nextValues = selectedValues.filter((value) => value !== optionValue);
    } else if (optionValue === currentStep.exclusiveOption) {
      nextValues = [optionValue];
    } else {
      const currentSelections = selectedValues.filter(
        (value) => value !== currentStep.exclusiveOption,
      );

      if (currentSelections.length >= currentStep.maxSelections) {
        setStepError(
          `Você pode selecionar no máximo ${currentStep.maxSelections} opções.`,
        );
        return;
      }

      nextValues = [...currentSelections, optionValue];
    }

    updateAnswer(
      currentStep.field,
      nextValues as RecommendationQuizRequest[typeof currentStep.field],
    );
    setStepError(undefined);
    clearFailedSubmission();
  }

  function handleSingleChoiceChange(
    currentStep: Extract<RecommendationQuizStep, { selectionMode: "single" }>,
    optionValue: string,
  ) {
    updateAnswer(
      currentStep.field,
      optionValue as RecommendationQuizRequest[typeof currentStep.field],
    );
    setStepError(undefined);
    clearFailedSubmission();
  }

  if (recommendationResult) {
    return (
      <div className="mx-auto max-w-272 lg:pt-4">
        <Card className="max-w-3xl border-brand-primary/25">
          <p className="mb-3 flex items-center gap-2 font-interface text-label-caps font-semibold uppercase tracking-wide text-brand-primary">
            <Sparkles aria-hidden="true" className="size-4" />
            Recomendações personalizadas
          </p>
          <h1 className="font-heading text-2xl text-text-primary">
            Seu perfil foi enviado
          </h1>
          <p className="mt-2 font-interface text-sm leading-relaxed text-text-secondary">
            Recebemos suas respostas e preparamos{" "}
            {recommendationResult.recommendations.length} sugestões para você.
          </p>
          <Button className="mt-6" onClick={handleEditAnswers}>
            Revisar respostas
          </Button>
        </Card>
      </div>
    );
  }

  if (!step) return null;

  return (
    <div className="mx-auto max-w-272 lg:pt-4">
      <header className="mb-8">
        <p className="mb-2 flex items-center gap-2 font-interface text-label-caps font-semibold uppercase tracking-wide text-brand-primary">
          <Sparkles aria-hidden="true" className="size-4" />
          Recomendações personalizadas
        </p>
        <h1
          id="recommendation-quiz-title"
          data-route-focus="/recommendations/quiz"
          tabIndex={-1}
          className="font-heading text-[2rem] leading-tight font-medium text-text-primary sm:text-[2.5rem]"
        >
          Descubra sua próxima leitura
        </h1>
        <p className="mt-2 max-w-2xl font-interface text-sm leading-relaxed text-text-secondary">
          Responda algumas perguntas sobre suas preferências e encontre livros
          que combinam com o que você procura.
        </p>
      </header>

      <Card className="max-w-3xl border-brand-primary/25 shadow-[0_1px_4px_rgba(47,36,17,0.07)]">
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between gap-4 text-sm text-text-secondary">
            <span aria-live="polite">
              {`Pergunta ${progressValue} de ${quizQuestionCount}`}
            </span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Progresso das perguntas do quiz"
            aria-valuemin={0}
            aria-valuemax={quizQuestionCount}
            aria-valuenow={progressValue}
            className="h-2 overflow-hidden rounded-full bg-border-default/50"
          >
            <div
              className="h-full rounded-full bg-brand-primary transition-[width] duration-200 motion-reduce:transition-none"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <form noValidate onSubmit={handleContinue}>
          <fieldset
            disabled={recommendationMutation.isPending}
            aria-describedby={stepError ? "quiz-step-error" : undefined}
          >
            <legend className="font-heading text-xl leading-tight text-text-primary">
              {step.question}
            </legend>
            <p className="mt-2 text-sm text-text-secondary">
              {step.selectionMode === "multiple"
                ? `Escolha até ${step.maxSelections} opções.`
                : "Escolha uma opção."}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {step.options.map((option) => {
                const currentValue = draft[step.field];
                const isSelected = Array.isArray(currentValue)
                  ? (currentValue as string[]).includes(option.value)
                  : currentValue === option.value;

                return (
                  <button
                    type="button"
                    key={option.value}
                    aria-pressed={isSelected}
                    onClick={() => {
                      if (step.selectionMode === "multiple") {
                        handleMultipleChoiceChange(step, option.value);
                      } else {
                        handleSingleChoiceChange(step, option.value);
                      }
                    }}
                    className={`flex min-h-12 cursor-pointer items-center rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary motion-reduce:transition-none ${
                      isSelected
                        ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                        : "border-border-default bg-background-canvas text-text-primary hover:border-brand-primary/60"
                    }`}
                  >
                    <span className={isSelected ? "font-semibold" : ""}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {step.selectionMode === "multiple" && (
            <p className="mt-3 text-sm text-text-secondary" aria-live="polite">
              {(Array.isArray(draft[step.field])
                ? draft[step.field]?.length
                : 0) ?? 0}{" "}
              de {step.maxSelections} selecionadas
            </p>
          )}

          {currentStepIndex === quizQuestionCount - 1 && (
            <div className="mt-6 border-t border-border-default pt-5">
              <label
                htmlFor="recommendation-additional-context"
                className="text-sm font-semibold text-text-primary"
              >
                Quer acrescentar algum contexto? (opcional)
              </label>
              <textarea
                id="recommendation-additional-context"
                value={draft.additionalContext ?? ""}
                maxLength={500}
                onChange={(event) => {
                  updateAdditionalContext(event.currentTarget.value);
                  clearFailedSubmission();
                }}
                disabled={recommendationMutation.isPending}
                rows={3}
                className="mt-2 w-full rounded-lg border border-border-control bg-background-canvas px-3 py-2 text-sm text-text-primary focus-visible:border-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
              />
              <p className="mt-1 text-right text-xs text-text-secondary">
                {(draft.additionalContext ?? "").length}/500
              </p>
              <p className="text-xs text-text-secondary">
                O contexto não altera o progresso das sete perguntas.
              </p>
            </div>
          )}

          {stepError && (
            <p
              id="quiz-step-error"
              role="alert"
              className="mt-4 text-sm text-feedback-error"
            >
              {stepError}
            </p>
          )}

          {recommendationMutation.isPending && (
            <p role="status" className="mt-4 text-sm text-text-secondary">
              Enviando suas respostas…
            </p>
          )}

          {recommendationMutation.isError && (
            <div className="mt-4">
              <ErrorState
                message={recommendationMutation.error.message}
                onRetry={handleRetry}
              />
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse justify-between gap-3 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              onClick={handleBack}
              disabled={
                currentStepIndex === 0 || recommendationMutation.isPending
              }
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Voltar
            </Button>
            <Button
              type="submit"
              loading={recommendationMutation.isPending}
              disabled={recommendationMutation.isPending}
            >
              {currentStepIndex === quizQuestionCount - 1
                ? "Concluir quiz"
                : "Continuar"}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
