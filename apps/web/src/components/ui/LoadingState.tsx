type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = "Carregando" }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-3"
    >
      <span
        aria-hidden="true"
        className="size-5 animate-spin rounded-full border-2 border-brand-primary border-r-transparent motion-reduce:animate-none"
      />
      <span className="text-body-sm text-text-secondary">{label}</span>
    </div>
  );
}
