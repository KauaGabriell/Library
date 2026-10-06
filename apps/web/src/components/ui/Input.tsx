import { type ComponentProps, useId } from "react";
import { tv, type VariantProps } from "tailwind-variants";

const inputVariants = tv({
  base: "min-h-11 w-full border-b-2 border-b-[color:var(--color-border-default)] px-3 py-2 pr-10 text-[color:var(--color-text-primary)] placeholder:text-[color:var(--color-text-muted)] transition-colors focus-visible:border-b-[color:var(--color-brand-primary)] focus-visible:outline-none disabled:cursor-not-allowed disabled:text-[color:var(--color-text-muted)] disabled:opacity-50 motion-reduce:transition-none",
  variants: {
    variant: {
      primary: "bg-[var(--color-background-surface)]",
    },
    hasError: {
      true: "border-b-[color:var(--color-feedback-error)] focus-visible:border-b-[color:var(--color-feedback-error)]",
      false: "",
    },
  },
  defaultVariants: { variant: "primary", hasError: false },
});

type InputProps = Omit<ComponentProps<"input">, "children"> & {
  variant?: InputVariants;
  loading?: boolean;
  label: string;
  error?: string;
};

type InputVariants = VariantProps<typeof inputVariants>["variant"];

export function Input({
  variant,
  loading = false,
  className,
  label,
  error,
  id,
  type = "text",
  disabled,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  if (typeof label !== "string" || !label.trim()) {
    throw new Error("Input requires a non-empty label.");
  }

  const hasError = Boolean(error);
  const errorMessageId = `${inputId}-error`;
  const describedBy =
    [ariaDescribedBy, hasError ? errorMessageId : undefined]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={inputId}
        className="text-sm font-semibold text-(--color-text-primary)"
      >
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          id={inputId}
          type={type}
          disabled={disabled}
          aria-busy={loading || undefined}
          aria-invalid={hasError ? true : ariaInvalid}
          aria-describedby={describedBy}
          className={inputVariants({ variant, hasError, className })}
        />
        {loading && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-(--color-brand-primary)"
          >
            <span className="block size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />
          </span>
        )}
      </div>
      {hasError && (
        <p
          id={errorMessageId}
          role="alert"
          className="text-sm text-(--color-feedback-error)"
        >
          {error}
        </p>
      )}
    </div>
  );
}
