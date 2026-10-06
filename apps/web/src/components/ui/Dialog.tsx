import {
  type ReactNode,
  type SyntheticEvent,
  useEffect,
  useId,
  useRef,
} from "react";
import { Button } from "./Button";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function Dialog({ open, onClose, title, children }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={handleCancel}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-dialog border border-border-default bg-background-canvas p-0 text-text-primary shadow-xl backdrop:bg-black/40 backdrop:backdrop-blur-[1px]"
    >
      <div className="flex items-start justify-between gap-6 border-b border-border-default px-6 py-4">
        <h2 id={titleId} className="font-heading text-heading-md">
          {title}
        </h2>
        <Button variant="ghost" onClick={onClose} aria-label="Fechar diálogo">
          Fechar
        </Button>
      </div>
      <div className="p-6">{children}</div>
    </dialog>
  );
}
