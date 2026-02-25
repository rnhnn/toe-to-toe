import { useEffect } from "react";

export default function useGameScale(baseWidth, baseHeight) {
  useEffect(() => {
    const root = document.documentElement;

    root.style.setProperty("--game-base-width", `${baseWidth}px`);
    root.style.setProperty("--game-base-height", `${baseHeight}px`);

    const handleResize = () => {
      const scaleX = window.innerWidth / baseWidth;
      const scaleY = window.innerHeight / baseHeight;
      const scale = Math.min(scaleX, scaleY);

      root.style.setProperty("--game-scale", scale);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [baseWidth, baseHeight]);
}