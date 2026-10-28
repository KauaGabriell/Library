import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

export function RouteFocusManager() {
  const { pathname } = useLocation();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) return;

    previousPathname.current = pathname;
    const focusBeforeNavigation = document.activeElement;
    const focusRouteHeading = () => {
      const target = Array.from(
        document.querySelectorAll<HTMLElement>("[data-route-focus]"),
      ).find((element) => element.dataset.routeFocus === pathname);

      if (!target) return false;

      const activeElement = document.activeElement;
      const userMovedFocus =
        activeElement !== focusBeforeNavigation &&
        activeElement !== document.body &&
        activeElement !== document.documentElement;

      if (userMovedFocus) return true;

      target.focus();
      return true;
    };

    const observer = new MutationObserver(() => {
      if (focusRouteHeading()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const frameId = window.requestAnimationFrame(() => {
      if (focusRouteHeading()) observer.disconnect();
    });
    const timeoutId = window.setTimeout(() => observer.disconnect(), 5000);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
