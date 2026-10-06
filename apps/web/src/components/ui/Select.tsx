import { type ComponentProps, type ReactNode, useId } from "react";

type SelectProps = Omit<ComponentProps<"select">, "children"> & {
  label: string;
  error?: string;
  children: ReactNode;
};

export function Select({
  label,
  error,
  id,
  className,
  children,
  disabled,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const hasError = Boolean(error);
  const errorMessageId = `${selectId}-error`;
  const describedBy =
    [ariaDescribedBy, hasError ? errorMessageId : undefined]
      .filter(Boolean)
      .join(" ") || undefined;

  if (!label.trim()) {
    throw new Error("Select requires a non-empty label.");
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={selectId} className="text-label-md text-text-primary">
        {label}
      </label>
      <select
        {...props}
        id={selectId}
        disabled={disabled}
        aria-invalid={hasError ? true : ariaInvalid}
        aria-describedby={describedBy}
        className={`min-h-11 w-full border-b-2 border-border-default bg-background-surface px-3 py-2 text-text-primary transition-colors focus-visible:border-b-brand-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:text-text-muted disabled:opacity-50 motion-reduce:transition-none ${hasError ? "border-b-feedback-error focus-visible:border-b-feedback-error" : ""} ${className ?? ""}`}
      >
        {children}
      </select>
      {hasError && (
        <p
          id={errorMessageId}
          role="alert"
          className="text-body-sm text-feedback-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}
