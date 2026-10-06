import { Button } from "./Button";

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <section
      role="alert"
      className="flex flex-col items-start gap-4 rounded-card border border-feedback-error/40 bg-background-surface p-5"
    >
      <p className="text-body-md text-text-primary">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </section>
  );
}
