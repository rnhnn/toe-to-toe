// src/hooks/useSmoothActiveFloat.js
import { useEffect, useRef } from "react";

export function useSmoothActiveFloat(ref, active) {
  const wasActiveRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const shadow = el.querySelector(".side-shadow");
    const isActiveNow = !!active;
    const wasActive = wasActiveRef.current;

    if (isActiveNow) {
      el.style.transition = "";
      el.style.transform = "";
      if (shadow) {
        shadow.style.transition = "";
        shadow.style.transform = "";
        shadow.style.opacity = "";
      }
      el.classList.add("is-active");
      wasActiveRef.current = true;
      return;
    }

    if (wasActive) {
      const wrapperFrom = getComputedStyle(el).transform;
      const shadowCS = shadow ? getComputedStyle(shadow) : null;

      el.style.transform = wrapperFrom && wrapperFrom !== "none" ? wrapperFrom : "translateY(0)";
      if (shadow && shadowCS) {
        if (shadowCS.transform && shadowCS.transform !== "none") shadow.style.transform = shadowCS.transform;
        if (shadowCS.opacity) shadow.style.opacity = shadowCS.opacity;
      }

      el.classList.remove("is-active");

      requestAnimationFrame(() => {
        el.style.transition = "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)";
        el.style.transform = "translateY(0)";

        if (shadow) {
          shadow.style.transition =
            "transform 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms cubic-bezier(0.22, 1, 0.36, 1)";
          shadow.style.transform = "";
          shadow.style.opacity = "1";
        }

        window.setTimeout(() => {
          el.style.transition = "";
          el.style.transform = "";
          if (shadow) {
            shadow.style.transition = "";
            shadow.style.transform = "";
            shadow.style.opacity = "";
          }
        }, 280);
      });
    } else {
      el.classList.remove("is-active");
    }

    wasActiveRef.current = false;
  }, [active, ref]);
}