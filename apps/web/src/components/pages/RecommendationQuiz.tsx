import {
  type RecommendationQuizRequest,
  type RecommendationQuizResponse,
  recommendationQuizRequestSchema,
} from "@library/contracts";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useRecommendationQuiz } from "../../hooks/useRecommendationQuiz";
import { api } from "../../lib/api";
import { RecommendationResultCard } from "../recommendations/RecommendationResultCard";
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
    resetQuiz,
  } = useRecommendationQuiz();
  const navigate = useNavigate();
  const quizHeadingRef = useRef<HTMLHeadingElement>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const shouldFocusQuizHeading = useRef(false);
  const [stepError, setStepError] = useState<string>();
  const [lastSubmittedPayload, setLastSubmittedPayload] =
    useState<RecommendationQuizRequest>();
  const [recommendationResult, setRecommendationResult] =
    useState<RecommendationQuizResponse>();
  const recommendationMutation = useMutation({
    mutationFn: async (payload: RecommendationQuizRequest) => {
      const response = await api.post<RecommendationQuizResponse>(
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

  useEffect(() => {
    if (recommendationResult) {
      resultsHeadingRef.current?.focus();
      return;
    }

    if (shouldFocusQuizHeading.current) {
      quizHeadingRef.current?.focus();
      shouldFocusQuizHeading.current = false;
    }
  }, [recommendationResult]);

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

  function handleRetakeQuiz() {
    shouldFocusQuizHeading.current = true;
    setRecommendationResult(undefined);
    setLastSubmittedPayload(undefined);
    setStepError(undefined);
    recommendationMutation.reset();
    resetQuiz();
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
          "Você pode selecionar no máximo " +
            currentStep.maxSelections +
            " opções.",
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
      <div className="mx-auto w-full max-w-7xl min-w-0 lg:pt-4">
        <header className="mb-8">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-primary/25 bg-background-surface px-3 py-1 font-interface text-label-caps font-semibold uppercase tracking-wide text-brand-primary">
            <Sparkles aria-hidden="true" className="size-4" />
            Curadoria IA concluída
          </p>
          <h1
            ref={resultsHeadingRef}
            tabIndex={-1}
            className="font-heading text-[2rem] leading-tight font-medium text-text-primary sm:text-[2.5rem]"
          >
            Encontramos estas obras para você
          </h1>
          <p className="mt-2 max-w-3xl font-interface text-sm leading-relaxed text-text-secondary">
            Com base nas suas preferências, selecionamos três jornadas
            literárias.
          </p>
        </header>

        <section
          aria-label="Livros recomendados"
          className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5"
        >
          {recommendationResult.recommendations.map((recommendation) => (
            <RecommendationResultCard
              key={JSON.stringify([
                recommendation.title,
                recommendation.author,
              ])}
              recommendation={recommendation}
            />
          ))}
        </section>

        <footer className="mt-8 flex flex-col gap-3 border-t border-border-default pt-5 sm:flex-row sm:items-center sm:justify-center">
          <Button type="button" variant="secondary" onClick={handleRetakeQuiz}>
            <RotateCcw aria-hidden="true" className="size-4" />
            Refazer quiz
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Voltar ao dashboard
          </Button>
        </footer>
      </div>
    );
  }

  if (!step) return null;

  return (
    <div className="mx-auto w-full max-w-272 min-w-0 lg:pt-4">
      <Card className="mx-auto w-full max-w-3xl min-w-0 border-brand-primary/25">
        <header className="mb-5 border-b border-border-default pb-5">
          <h1
            ref={quizHeadingRef}
            id="recommendation-quiz-title"
            data-route-focus="/recommendations/quiz"
            tabIndex={-1}
            className="font-heading text-[2rem] leading-tight font-medium text-text-primary sm:text-[2.5rem]"
          >
            Quiz de IA
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
            Responda sete perguntas sobre suas preferências para encontrar
            leituras que combinam com o seu momento.
          </p>
        </header>

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
            className="m-0 min-w-0 border-0 p-0"
          >
            <legend className="w-full max-w-2xl font-heading text-xl leading-tight text-text-primary">
              {step.question}
            </legend>
            <p className="mt-2 text-sm text-text-secondary">
              {step.selectionMode === "multiple"
                ? `Escolha até ${step.maxSelections} opções.`
                : "Escolha uma opção."}
            </p>

            <div className="mt-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              {step.options.map((option) => {
                const currentValue = draft[step.field];
                const isSelected = Array.isArray(currentValue)
                  ? (currentValue as string[]).includes(option.value)
                  : currentValue === option.value;
                const optionClassName = [
                  "flex min-h-12 min-w-0 cursor-pointer items-center gap-3 rounded-field border px-4 py-3 text-left transition-colors motion-reduce:transition-none focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-primary",
                  isSelected
                    ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                    : "border-border-default bg-background-canvas text-text-primary hover:border-brand-primary/60",
                ].join(" ");
                const indicatorClassName = [
                  "flex size-5 shrink-0 items-center justify-center border",
                  step.selectionMode === "single"
                    ? "rounded-full"
                    : "rounded-sm",
                  isSelected
                    ? "border-brand-primary bg-brand-primary text-background-canvas"
                    : "border-border-control bg-background-canvas",
                ].join(" ");

                return (
                  <label key={option.value} className={optionClassName}>
                    <input
                      type={
                        step.selectionMode === "multiple" ? "checkbox" : "radio"
                      }
                      name={step.field}
                      value={option.value}
                      checked={isSelected}
                      onChange={() => {
                        if (step.selectionMode === "multiple") {
                          handleMultipleChoiceChange(step, option.value);
                        } else {
                          handleSingleChoiceChange(step, option.value);
                        }
                      }}
                      className="peer sr-only"
                    />
                    <span aria-hidden="true" className={indicatorClassName}>
                      {isSelected &&
                        (step.selectionMode === "single" ? (
                          <span className="size-2 rounded-full bg-background-canvas" />
                        ) : (
                          <Check aria-hidden="true" className="size-3.5" />
                        ))}
                    </span>
                    <span className="min-w-0 flex-1 wrap-break-word">
                      {option.label}
                    </span>
                  </label>
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
                className="mt-2 w-full min-w-0 rounded-field border border-border-control bg-background-canvas px-3 py-2 text-sm text-text-primary focus-visible:border-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
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

          <div className="mt-6 flex flex-col-reverse justify-between gap-3 border-t border-border-default pt-5 sm:flex-row sm:items-center">
            {currentStepIndex === 0 ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate("/dashboard")}
              >
                Cancelar
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={handleBack}
                disabled={recommendationMutation.isPending}
              >
                <ArrowLeft aria-hidden="true" className="size-4" />
                Voltar
              </Button>
            )}
            <Button
              type="submit"
              loading={recommendationMutation.isPending}
              disabled={recommendationMutation.isPending}
              className="whitespace-nowrap"
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
