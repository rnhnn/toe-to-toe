import { useEffect, useRef, useState } from "react";
import Board from "./Board";
import songs from "../data/songs.json";

function calculateWinner(squares) {
  const size = 4;
  const at = (r, c) => squares[r * size + c];

  // rows
  for (let r = 0; r < size; r++) {
    const first = at(r, 0);
    if (
      first &&
      at(r, 1)?.player === first.player &&
      at(r, 2)?.player === first.player &&
      at(r, 3)?.player === first.player
    ) {
      return first.player;
    }
  }

  // cols
  for (let c = 0; c < size; c++) {
    const first = at(0, c);
    if (
      first &&
      at(1, c)?.player === first.player &&
      at(2, c)?.player === first.player &&
      at(3, c)?.player === first.player
    ) {
      return first.player;
    }
  }

  // diagonals
  const d1 = at(0, 0);
  if (
    d1 &&
    at(1, 1)?.player === d1.player &&
    at(2, 2)?.player === d1.player &&
    at(3, 3)?.player === d1.player
  ) {
    return d1.player;
  }

  const d2 = at(0, 3);
  if (
    d2 &&
    at(1, 2)?.player === d2.player &&
    at(2, 1)?.player === d2.player &&
    at(3, 0)?.player === d2.player
  ) {
    return d2.player;
  }

  return null;
}

function useSmoothActiveFloat(ref, active) {
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

    if (!isActiveNow && wasActive) {
      const wrapperFrom = getComputedStyle(el).transform;

      let shadowFromTransform = null;
      let shadowFromOpacity = null;
      if (shadow) {
        const cs = getComputedStyle(shadow);
        shadowFromTransform = cs.transform;
        shadowFromOpacity = cs.opacity;
      }

      if (wrapperFrom && wrapperFrom !== "none") {
        el.style.transform = wrapperFrom;
      } else {
        el.style.transform = "translateY(0)";
      }

      if (shadow) {
        if (shadowFromTransform && shadowFromTransform !== "none") {
          shadow.style.transform = shadowFromTransform;
        }
        if (shadowFromOpacity) {
          shadow.style.opacity = shadowFromOpacity;
        }
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

        const cleanup = () => {
          el.style.transition = "";
          el.style.transform = "";

          if (shadow) {
            shadow.style.transition = "";
            shadow.style.transform = "";
            shadow.style.opacity = "";
          }
        };

        window.setTimeout(cleanup, 280);
      });

      wasActiveRef.current = false;
    } else {
      el.classList.remove("is-active");
      wasActiveRef.current = false;
    }
  }, [active, ref]);
}

export default function Game() {
  const [squares, setSquares] = useState(Array(16).fill(null));
  const [starter, setStarter] = useState(null);
  const [turn, setTurn] = useState(null);
  const [johnSongIndex, setJohnSongIndex] = useState(0);
  const [paulSongIndex, setPaulSongIndex] = useState(0);

  const winner = calculateWinner(squares);

  const isJohnTurn = turn === "john" && !winner;
  const isPaulTurn = turn === "paul" && !winner;

  const johnRef = useRef(null);
  const paulRef = useRef(null);

  useSmoothActiveFloat(johnRef, isJohnTurn);
  useSmoothActiveFloat(paulRef, isPaulTurn);

  // -------- AUDIO: crossfade ONLY when previous is still playing ----------
  // Preload/cache base HTMLAudioElements by id
  const audioCacheRef = useRef(new Map());

  // WebAudio context + master gain (created lazily on first user click)
  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);

  // Track the currently playing snippet (if any)
  const currentPlaybackRef = useRef({
    el: null,
    source: null,
    gain: null,
  });

  // Tune these:
  const TARGET_VOL = 1.0; // steady volume (no added fade-in/out)
  const XFADE_SEC = 0.45; // crossfade duration when overlapping

  function getAudioContext() {
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
  }

  function getBaseAudioForId(id) {
    const cache = audioCacheRef.current;
    if (!cache.has(id)) {
      const base = new Audio(`/audios/${id}.mp3`);
      base.preload = "auto";
      base.crossOrigin = "anonymous";
      cache.set(id, base);
    }
    return cache.get(id);
  }

  function cleanupPlayback(pb) {
    if (!pb) return;
    try {
      pb.source?.disconnect();
    } catch {}
    try {
      pb.gain?.disconnect();
    } catch {}
    // Note: pb.el is a cloned element; letting it go is fine.
  }

  function stopPlayback(pb) {
    if (!pb) return;
    try {
      if (pb.el) {
        pb.el.pause();
        pb.el.currentTime = 0;
      }
    } catch {}
    cleanupPlayback(pb);
  }

  function isPlaybackActive(pb) {
    if (!pb?.el) return false;
    // "ended" is only true after playback ends; also guard paused
    return !pb.el.paused && !pb.el.ended;
  }

  function playSongSnippetByIdCrossfade(id) {
    if (!id) return;

    const ctx = getAudioContext();
    const master = masterGainRef.current;

    // Fallback if WebAudio isn't available
    if (!ctx || !master) {
      const base = getBaseAudioForId(id);
      const el = base.cloneNode(true);
      el.volume = TARGET_VOL;
      el.currentTime = 0;
      el.play().catch(() => {});
      return;
    }

    // Must be resumed after user gesture in some browsers
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const prev = currentPlaybackRef.current;
    const hasPrevPlaying = isPlaybackActive(prev);

    // Create next snippet playback chain
    const base = getBaseAudioForId(id);
    const el = base.cloneNode(true);
    el.currentTime = 0;

    const source = ctx.createMediaElementSource(el);
    const gain = ctx.createGain();

    // IMPORTANT: No extra fade-in/out by default.
    // Only do a fade-in if we're crossfading from a currently playing snippet.
    const now = ctx.currentTime;

    if (hasPrevPlaying) {
      // New starts at 0, ramps up to TARGET_VOL during crossfade
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(TARGET_VOL, now + XFADE_SEC);

      // Old ramps down to 0 during crossfade, then stop it
      if (prev.gain) {
        prev.gain.gain.cancelScheduledValues(now);
        prev.gain.gain.setValueAtTime(prev.gain.gain.value, now);
        prev.gain.gain.linearRampToValueAtTime(0, now + XFADE_SEC);
      }

      window.setTimeout(() => {
        // If it's still the same prev reference, stop it; otherwise it was already replaced
        stopPlayback(prev);
      }, Math.ceil(XFADE_SEC * 1000) + 30);
    } else {
      // No overlap -> start immediately at full volume (no fade)
      gain.gain.setValueAtTime(TARGET_VOL, now);
    }

    source.connect(gain);
    gain.connect(master);

    // Register as current playback
    currentPlaybackRef.current = { el, source, gain };

    el.play().catch(() => {
      stopPlayback({ el, source, gain });
      // If this failed and it's still current, clear it
      const cur = currentPlaybackRef.current;
      if (cur.el === el) currentPlaybackRef.current = { el: null, source: null, gain: null };
    });

    el.addEventListener(
      "ended",
      () => {
        // No fade-out on end; baked-in fades remain untouched.
        cleanupPlayback({ el, source, gain });
        const cur = currentPlaybackRef.current;
        if (cur.el === el) currentPlaybackRef.current = { el: null, source: null, gain: null };
      },
      { once: true }
    );
  }

  function handleChooseStarter(player) {
    setStarter(player);
    setTurn(player);
  }

  function handleSquareClick(index) {
    if (!turn) return;
    if (winner) return;
    if (squares[index] !== null) return;

    const nextSquares = [...squares];

    if (turn === "john") {
      const song = songs?.john?.[johnSongIndex] ?? null;
      nextSquares[index] = { player: "john", song };
      setJohnSongIndex((n) => n + 1);

      playSongSnippetByIdCrossfade(song?.id);
    } else {
      const song = songs?.paul?.[paulSongIndex] ?? null;
      nextSquares[index] = { player: "paul", song };
      setPaulSongIndex((n) => n + 1);

      playSongSnippetByIdCrossfade(song?.id);
    }

    setSquares(nextSquares);
    setTurn(turn === "john" ? "paul" : "john");
  }

  function handleReset() {
    setSquares(Array(16).fill(null));
    setTurn(null);
    setStarter(null);
    setJohnSongIndex(0);
    setPaulSongIndex(0);

    // stop any currently playing snippet
    const cur = currentPlaybackRef.current;
    if (cur?.el) stopPlayback(cur);
    currentPlaybackRef.current = { el: null, source: null, gain: null };

    [johnRef.current, paulRef.current].forEach((el) => {
      if (!el) return;
      el.classList.remove("is-active");
      el.style.transition = "";
      el.style.transform = "";

      const shadow = el.querySelector(".side-shadow");
      if (shadow) {
        shadow.style.transition = "";
        shadow.style.transform = "";
        shadow.style.opacity = "";
      }
    });
  }

  return (
    <>
      {starter === null && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2 className="modal-title">Who goes first?</h2>
            <div className="modal-actions">
              <button type="button" onClick={() => handleChooseStarter("john")}>
                Lennon
              </button>
              <button type="button" onClick={() => handleChooseStarter("paul")}>
                McCartney
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="game-layout">
        <div ref={paulRef} className="side-image left">
          <span className="side-shadow" aria-hidden="true" />
          <img src="/images/hofner.png" alt="Paul McCartney Hofner Bass" />
        </div>

        <div className="board-area">
          {winner && <p>{`Winner: ${winner === "john" ? "John" : "Paul"}`}</p>}
          <Board squares={squares} onSquareClick={handleSquareClick} />
          <button className="board-reset" type="button" onClick={handleReset}>
            Reset
          </button>
        </div>

        <div ref={johnRef} className="side-image right">
          <span className="side-shadow" aria-hidden="true" />
          <img src="/images/casino.png" alt="John Lennon Casino Guitar" />
        </div>
      </section>
    </>
  );
}