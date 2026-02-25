// src/hooks/useCrossfadeAudio.js
import { useRef, useState } from "react";

const TARGET_VOL = 1.0;
const XFADE_SEC = 0.45;

export function useCrossfadeAudio() {
  const audioCacheRef = useRef(new Map());
  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  const currentRef = useRef({ el: null, source: null, gain: null });
  const [isPlaying, setIsPlaying] = useState(false);

  const getCtx = () => {
    if (audioCtxRef.current) return audioCtxRef.current;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;

    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);

    audioCtxRef.current = ctx;
    masterGainRef.current = master;
    return ctx;
  };

  const getBaseEl = (id) => {
    const cache = audioCacheRef.current;
    if (!cache.has(id)) {
      const base = new Audio(`/audios/${id}.mp3`);
      base.preload = "auto";
      base.crossOrigin = "anonymous";
      cache.set(id, base);
    }
    return cache.get(id);
  };

  const cleanup = (pb) => {
    try {
      pb?.source?.disconnect();
    } catch {}
    try {
      pb?.gain?.disconnect();
    } catch {}
  };

  const stop = (pb) => {
    if (!pb?.el) return;
    try {
      pb.el.pause();
      pb.el.currentTime = 0;
    } catch {}
    cleanup(pb);
  };

  const stopAll = () => {
    stop(currentRef.current);
    currentRef.current = { el: null, source: null, gain: null };
    setIsPlaying(false);
  };

  const play = (id) => {
    if (!id) return;

    const ctx = getCtx();
    const master = masterGainRef.current;

    if (!ctx || !master) {
      const el = getBaseEl(id).cloneNode(true);
      el.volume = TARGET_VOL;
      el.currentTime = 0;

      setIsPlaying(true);
      el.play().catch(() => setIsPlaying(false));
      el.addEventListener("ended", () => setIsPlaying(false), { once: true });
      return;
    }

    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const prev = currentRef.current;
    const hasPrev = prev?.el && !prev.el.paused && !prev.el.ended;

    const el = getBaseEl(id).cloneNode(true);
    el.currentTime = 0;

    const source = ctx.createMediaElementSource(el);
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    if (hasPrev) {
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(TARGET_VOL, now + XFADE_SEC);

      if (prev.gain) {
        prev.gain.gain.cancelScheduledValues(now);
        prev.gain.gain.setValueAtTime(prev.gain.gain.value, now);
        prev.gain.gain.linearRampToValueAtTime(0, now + XFADE_SEC);
      }

      window.setTimeout(() => stop(prev), Math.ceil(XFADE_SEC * 1000) + 30);
    } else {
      gain.gain.setValueAtTime(TARGET_VOL, now);
    }

    source.connect(gain);
    gain.connect(master);

    currentRef.current = { el, source, gain };
    setIsPlaying(true);

    el.play().catch(() => {
      stop({ el, source, gain });
      if (currentRef.current.el === el) currentRef.current = { el: null, source: null, gain: null };
      setIsPlaying(false);
    });

    el.addEventListener(
      "ended",
      () => {
        cleanup({ el, source, gain });
        if (currentRef.current.el === el) currentRef.current = { el: null, source: null, gain: null };
        setIsPlaying(false);
      },
      { once: true }
    );
  };

  return { play, stopAll, isPlaying, currentElRef: currentRef };
}