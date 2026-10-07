import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type TransitionPanelProps = {
  activeKey: string;
  children: ReactNode;
  className?: string;
  direction: -1 | 1;
};

export function TransitionPanel({
  activeKey,
  children,
  className,
  direction,
}: TransitionPanelProps) {
  const reducedMotion = useReducedMotion();
  const distance = reducedMotion ? 0 : 48;

  const variants = {
    enter: (travelDirection: number) => ({
      x: travelDirection * distance,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (travelDirection: number) => ({
      x: -travelDirection * distance,
      opacity: 0,
    }),
  };

  return (
    <div
      className={["relative overflow-hidden", className]
        .filter(Boolean)
        .join(" ")}
    >
      <AnimatePresence initial={false} mode="popLayout" custom={direction}>
        <motion.div
          key={activeKey}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            duration: reducedMotion ? 0.12 : 0.26,
            ease: "easeOut",
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
