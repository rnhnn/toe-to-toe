import { useEffect, useMemo, useRef, useState } from "react";
import Board from "./Board";
import songs from "../data/songs.json";

const SIZE = 4;
const TOTAL = SIZE * SIZE;

const LINES_4X4 = (() => {
  const lines = [];
  for (let r = 0; r < SIZE; r++) lines.push([r * 4 + 0, r * 4 + 1, r * 4 + 2, r * 4 + 3]);
  for (let c = 0; c < SIZE; c++) lines.push([0 * 4 + c, 1 * 4 + c, 2 * 4 + c, 3 * 4 + c]);
  lines.push([0, 5, 10, 15], [3, 6, 9, 12]);
  return lines;
})();

const CENTER = new Set([5, 6, 9, 10]);
const CORNERS = new Set([0, 3, 12, 15]);

const TARGET_VOL = 1.0;
const XFADE_SEC = 0.45;

const CPU_THINK_MIN_MS = 500;
const CPU_THINK_MAX_MS = 1100;

function calculateWinnerInfo(squares) {
  for (const line of LINES_4X4) {
    const a = squares[line[0]];
    if (a && line.every((i) => squares[i]?.player === a.player)) return { player: a.player, line };
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

function findWinningMove(squares, player) {
  for (const line of LINES_4X4) {
    let count = 0;
    let empty = null;

    for (const i of line) {
      const cell = squares[i];
      if (!cell) empty = i;
      else if (cell.player === player) count++;
    }

    if (count === 3 && empty !== null) return empty;
  }
  return null;
}

function scoreMove(squares, idx, cpuPlayer, humanPlayer) {
  let score = CENTER.has(idx) ? 15 : CORNERS.has(idx) ? 10 : 6;

  for (const line of LINES_4X4) {
    if (!line.includes(idx)) continue;

    let cpu = 0;
    let human = 0;

    for (const i of line) {
      const cell = i === idx ? { player: cpuPlayer } : squares[i];
      if (!cell) continue;
      if (cell.player === cpuPlayer) cpu++;
      else if (cell.player === humanPlayer) human++;
    }

    if (human === 0) {
      if (cpu === 2) score += 8;
      if (cpu === 3) score += 30;
    }
  }

  return score;
}

function chooseCpuMove(squares, cpuPlayer, humanPlayer) {
  const empties = [];
  for (let i = 0; i < squares.length; i++) if (!squares[i]) empties.push(i);
  if (!empties.length) return null;

  const win = findWinningMove(squares, cpuPlayer);
  if (win !== null) return win;

  const block = findWinningMove(squares, humanPlayer);
  if (block !== null) return block;

  const candidates = empties.map((idx) => {
    const next = [...squares];
    next[idx] = { player: cpuPlayer, song: null };
    const blunder = findWinningMove(next, humanPlayer) !== null;
    return { idx, score: scoreMove(squares, idx, cpuPlayer, humanPlayer) + (blunder ? -50 : 0), blunder };
  });

  const usable = candidates.some((c) => !c.blunder) ? candidates.filter((c) => !c.blunder) : candidates;
  usable.sort((a, b) => b.score - a.score);

  const roll = Math.random();
  if (roll < 0.7) return usable[0].idx;

  if (roll < 0.95) {
    const top = usable.slice(0, Math.min(3, usable.length));
    return top[Math.floor(Math.random() * top.length)].idx;
  }

  return usable[Math.floor(Math.random() * usable.length)].idx;
}

function useCrossfadeAudio() {
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

export default function Game() {
  const [squares, setSquares] = useState(() => Array(TOTAL).fill(null));
  const [humanPlayer, setHumanPlayer] = useState(null);
  const [turn, setTurn] = useState(null);
  const [starter, setStarter] = useState(null);
  const [songIndex, setSongIndex] = useState({ john: 0, paul: 0 });

  const cpuPlayer = humanPlayer ? (humanPlayer === "john" ? "paul" : "john") : null;

  const winnerInfo = useMemo(() => calculateWinnerInfo(squares), [squares]);
  const winner = winnerInfo?.player ?? null;

  const isBoardFull = useMemo(() => squares.every(Boolean), [squares]);
  const isTie = !winner && isBoardFull;

  const winningLine = winner ? winnerInfo.line : isTie ? squares.map((_, i) => i) : null;

  const isJohnTurn = turn === "john" && !winner;
  const isPaulTurn = turn === "paul" && !winner;

  const johnRef = useRef(null);
  const paulRef = useRef(null);

  useSmoothActiveFloat(johnRef, isJohnTurn);
  useSmoothActiveFloat(paulRef, isPaulTurn);

  const cpuTokenRef = useRef(0);
  const { play, stopAll, isPlaying, currentElRef } = useCrossfadeAudio();

  const placeMove = (player, index, nextSquaresOverride) => {
    const list = songs?.[player] ?? [];
    const i = songIndex[player] ?? 0;
    const song = list[i] ?? null;

    const nextSquares = nextSquaresOverride ? [...nextSquaresOverride] : [...squares];
    nextSquares[index] = { player, song };

    setSquares(nextSquares);
    setSongIndex((s) => ({ ...s, [player]: (s[player] ?? 0) + 1 }));
    play(song?.id);

    setTurn(player === "john" ? "paul" : "john");
  };

  const handleChooseStarter = (player) => {
    setStarter(player);
    setTurn(player);
    setHumanPlayer(player);
    cpuTokenRef.current++;
  };

  const handleSquareClick = (index) => {
    if (!turn || winner || squares[index]) return;
    if (cpuPlayer && turn === cpuPlayer) return;
    placeMove(turn, index);
  };

  useEffect(() => {
    if (!humanPlayer || !cpuPlayer) return;
    if (!turn || winner || turn !== cpuPlayer) return;
    if (isBoardFull) return;

    const token = ++cpuTokenRef.current;

    const waitMs = (ms) =>
      new Promise((resolve) => {
        const t = window.setTimeout(resolve, ms);
        const check = () => {
          if (cpuTokenRef.current !== token) {
            window.clearTimeout(t);
            resolve();
            return;
          }
          requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      });

    const waitForAudioEnd = () =>
      new Promise((resolve) => {
        const el = currentElRef.current?.el;
        if (!el || el.paused || el.ended) return resolve();

        const done = () => resolve();
        el.addEventListener("ended", done, { once: true });

        const check = () => {
          if (cpuTokenRef.current !== token) {
            el.removeEventListener("ended", done);
            resolve();
            return;
          }
          requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      });

    (async () => {
      if (isPlaying) await waitForAudioEnd();
      if (cpuTokenRef.current !== token) return;
      if (winner || turn !== cpuPlayer) return;

      const thinkMs =
        CPU_THINK_MIN_MS + Math.floor(Math.random() * (CPU_THINK_MAX_MS - CPU_THINK_MIN_MS + 1));
      await waitMs(thinkMs);
      if (cpuTokenRef.current !== token) return;
      if (winner || turn !== cpuPlayer) return;

      const move = chooseCpuMove(squares, cpuPlayer, humanPlayer);
      if (move === null || squares[move]) return;

      placeMove(cpuPlayer, move, squares);
    })();
  }, [humanPlayer, cpuPlayer, turn, winner, squares, isBoardFull, isPlaying, currentElRef, songIndex]);

  const handleReset = () => {
    setSquares(Array(TOTAL).fill(null));
    setTurn(null);
    setStarter(null);
    setHumanPlayer(null);
    setSongIndex({ john: 0, paul: 0 });

    cpuTokenRef.current++;
    stopAll();

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
  };

  return (
    <>
      <div className={`modal-overlay ${starter !== null ? "is-hidden" : ""}`} role="dialog" aria-modal="true">
        <div className="modal">
          <h2 className="modal-title">Player Selection:</h2>

          <div className="modal-actions modal-actions--portraits">
            <button
              type="button"
              className="starter-button starter-button--paul"
              onClick={() => handleChooseStarter("paul")}
              aria-label="Play as Paul McCartney (CPU is John)"
            >
              <img src="/images/paul.png" alt="Paul McCartney portrait" />
            </button>

            <button
              type="button"
              className="starter-button starter-button--john"
              onClick={() => handleChooseStarter("john")}
              aria-label="Play as John Lennon (CPU is Paul)"
            >
              <img src="/images/john.png" alt="John Lennon portrait" />
            </button>
          </div>
        </div>
      </div>

      <section className="game-layout">
        <div
          ref={paulRef}
          className={`side-image left ${isPaulTurn ? "is-active" : ""} ${winner === "paul" ? "is-winner" : ""} ${
            isTie ? "is-tie" : ""
          }`}
        >
          <span className="side-shadow" aria-hidden="true" />
          <img src="/images/hofner.png" alt="Paul McCartney Hofner Bass" />
        </div>

        <div className="board-area">
          <Board squares={squares} onSquareClick={handleSquareClick} winningLine={winningLine} winner={winner} />

          <button className="board-reset" type="button" onClick={handleReset}>
            Reset
          </button>
        </div>

        <div
          ref={johnRef}
          className={`side-image right ${isJohnTurn ? "is-active" : ""} ${winner === "john" ? "is-winner" : ""} ${
            isTie ? "is-tie" : ""
          }`}
        >
          <span className="side-shadow" aria-hidden="true" />
          <img src="/images/casino.png" alt="John Lennon Casino Guitar" />
        </div>
      </section>
    </>
  );
}