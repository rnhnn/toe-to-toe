import { useEffect, useRef, useState } from "react";
import Board from "./Board";
import songs from "../data/songs.json";

/**
 * Returns:
 * - null if no winner
 * - { player: "john"|"paul", line: number[] } if winner, where line is 4 indices
 */
function calculateWinnerInfo(squares) {
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
      return { player: first.player, line: [r * 4 + 0, r * 4 + 1, r * 4 + 2, r * 4 + 3] };
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
      return { player: first.player, line: [0 * 4 + c, 1 * 4 + c, 2 * 4 + c, 3 * 4 + c] };
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
    return { player: d1.player, line: [0, 5, 10, 15] };
  }

  const d2 = at(0, 3);
  if (
    d2 &&
    at(1, 2)?.player === d2.player &&
    at(2, 1)?.player === d2.player &&
    at(3, 0)?.player === d2.player
  ) {
    return { player: d2.player, line: [3, 6, 9, 12] };
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

// ---------------- CPU helpers ----------------

function buildLines4x4() {
  const lines = [];
  for (let r = 0; r < 4; r++) lines.push([r * 4 + 0, r * 4 + 1, r * 4 + 2, r * 4 + 3]);
  for (let c = 0; c < 4; c++) lines.push([0 * 4 + c, 1 * 4 + c, 2 * 4 + c, 3 * 4 + c]);
  lines.push([0, 5, 10, 15]);
  lines.push([3, 6, 9, 12]);
  return lines;
}

const LINES_4X4 = buildLines4x4();

function findWinningMove(squares, player) {
  for (const line of LINES_4X4) {
    let count = 0;
    let emptyIdx = null;
    for (const i of line) {
      const cell = squares[i];
      if (!cell) emptyIdx = i;
      else if (cell.player === player) count++;
    }
    if (count === 3 && emptyIdx !== null) return emptyIdx;
  }
  return null;
}

function wouldGiveOpponentImmediateWin(nextSquares, opponent) {
  return findWinningMove(nextSquares, opponent) !== null;
}

function scoreMove(squares, idx, cpuPlayer, humanPlayer) {
  const center = new Set([5, 6, 9, 10]);
  const corners = new Set([0, 3, 12, 15]);

  let score = 0;

  if (center.has(idx)) score += 15;
  else if (corners.has(idx)) score += 10;
  else score += 6;

  for (const line of LINES_4X4) {
    if (!line.includes(idx)) continue;

    let cpuCount = 0;
    let humanCount = 0;

    for (const i of line) {
      const cell = i === idx ? { player: cpuPlayer } : squares[i];
      if (!cell) continue;
      if (cell.player === cpuPlayer) cpuCount++;
      if (cell.player === humanPlayer) humanCount++;
    }

    if (humanCount === 0) {
      if (cpuCount === 2) score += 8;
      if (cpuCount === 3) score += 30;
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
    const blunder = wouldGiveOpponentImmediateWin(next, humanPlayer);
    const baseScore = scoreMove(squares, idx, cpuPlayer, humanPlayer);
    return { idx, score: baseScore + (blunder ? -50 : 0), blunder };
  });

  const hasSafe = candidates.some((c) => !c.blunder);
  const usable = hasSafe ? candidates.filter((c) => !c.blunder) : candidates;

  usable.sort((a, b) => b.score - a.score);

  const roll = Math.random();
  if (roll < 0.7) return usable[0].idx;

  if (roll < 0.95) {
    const topN = usable.slice(0, Math.min(3, usable.length));
    return topN[Math.floor(Math.random() * topN.length)].idx;
  }

  return usable[Math.floor(Math.random() * usable.length)].idx;
}

export default function Game() {
  const [squares, setSquares] = useState(Array(16).fill(null));
  const [starter, setStarter] = useState(null);
  const [turn, setTurn] = useState(null);

  const [humanPlayer, setHumanPlayer] = useState(null);
  const cpuPlayer = humanPlayer ? (humanPlayer === "john" ? "paul" : "john") : null;

  const [johnSongIndex, setJohnSongIndex] = useState(0);
  const [paulSongIndex, setPaulSongIndex] = useState(0);

  const winnerInfo = calculateWinnerInfo(squares);
  const winner = winnerInfo?.player ?? null;

  const isBoardFull = squares.every((s) => s !== null);
  const isTie = !winner && isBoardFull;

  const winningLine = winner
    ? winnerInfo.line
    : isTie
    ? squares.map((_, i) => i)
    : null;

  const isJohnTurn = turn === "john" && !winner;
  const isPaulTurn = turn === "paul" && !winner;

  const johnRef = useRef(null);
  const paulRef = useRef(null);

  useSmoothActiveFloat(johnRef, isJohnTurn);
  useSmoothActiveFloat(paulRef, isPaulTurn);

  // -------- AUDIO: crossfade ONLY when previous is still playing ----------
  const audioCacheRef = useRef(new Map());
  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);

  const currentPlaybackRef = useRef({ el: null, source: null, gain: null });
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // CPU cancellation token (reset/new selection/etc.)
  const cpuTokenRef = useRef(0);

  // -------- Tunables (place CPU delay HERE, next to your existing tunables) --------
  const TARGET_VOL = 1.0;
  const XFADE_SEC = 0.45;

  // CPU "thinking" delay
  const CPU_THINK_MIN_MS = 500;
  const CPU_THINK_MAX_MS = 1100;

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
    return !pb.el.paused && !pb.el.ended;
  }

  function waitForAudioToFinish(tokenAtStart) {
    return new Promise((resolve) => {
      const cur = currentPlaybackRef.current?.el;
      if (!cur || cur.paused || cur.ended) {
        resolve();
        return;
      }

      const onEnd = () => resolve();
      cur.addEventListener("ended", onEnd, { once: true });

      const check = () => {
        if (cpuTokenRef.current !== tokenAtStart) {
          cur.removeEventListener("ended", onEnd);
          resolve();
          return;
        }
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  }

  function waitMs(ms, tokenAtStart) {
    return new Promise((resolve) => {
      const t = window.setTimeout(resolve, ms);

      const check = () => {
        if (cpuTokenRef.current !== tokenAtStart) {
          window.clearTimeout(t);
          resolve();
          return;
        }
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  }

  function playSongSnippetByIdCrossfade(id) {
    if (!id) return;

    const ctx = getAudioContext();
    const master = masterGainRef.current;

    if (!ctx || !master) {
      const base = getBaseAudioForId(id);
      const el = base.cloneNode(true);
      el.volume = TARGET_VOL;
      el.currentTime = 0;

      setIsAudioPlaying(true);
      el.play().catch(() => setIsAudioPlaying(false));

      el.addEventListener("ended", () => setIsAudioPlaying(false), { once: true });
      return;
    }

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const prev = currentPlaybackRef.current;
    const hasPrevPlaying = isPlaybackActive(prev);

    const base = getBaseAudioForId(id);
    const el = base.cloneNode(true);
    el.currentTime = 0;

    const source = ctx.createMediaElementSource(el);
    const gain = ctx.createGain();

    const now = ctx.currentTime;

    if (hasPrevPlaying) {
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(TARGET_VOL, now + XFADE_SEC);

      if (prev.gain) {
        prev.gain.gain.cancelScheduledValues(now);
        prev.gain.gain.setValueAtTime(prev.gain.gain.value, now);
        prev.gain.gain.linearRampToValueAtTime(0, now + XFADE_SEC);
      }

      window.setTimeout(() => stopPlayback(prev), Math.ceil(XFADE_SEC * 1000) + 30);
    } else {
      gain.gain.setValueAtTime(TARGET_VOL, now);
    }

    source.connect(gain);
    gain.connect(master);

    currentPlaybackRef.current = { el, source, gain };
    setIsAudioPlaying(true);

    el.play().catch(() => {
      stopPlayback({ el, source, gain });
      const curPb = currentPlaybackRef.current;
      if (curPb.el === el) currentPlaybackRef.current = { el: null, source: null, gain: null };
      setIsAudioPlaying(false);
    });

    el.addEventListener(
      "ended",
      () => {
        cleanupPlayback({ el, source, gain });
        const curPb = currentPlaybackRef.current;
        if (curPb.el === el) currentPlaybackRef.current = { el: null, source: null, gain: null };
        setIsAudioPlaying(false);
      },
      { once: true }
    );
  }

  function handleChooseStarter(player) {
    setStarter(player);
    setTurn(player);
    setHumanPlayer(player);

    // cancel any pending CPU work from previous round
    cpuTokenRef.current++;
  }

  function handleSquareClick(index) {
    if (!turn) return;
    if (winner) return;
    if (squares[index] !== null) return;

    // human cannot play on CPU turn
    if (cpuPlayer && turn === cpuPlayer) return;

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

  // CPU turn effect (waits for audio, then "thinks", then plays)
  useEffect(() => {
    if (!humanPlayer || !cpuPlayer) return;
    if (!turn) return;
    if (winner) return;
    if (turn !== cpuPlayer) return;
    if (squares.every((s) => s !== null)) return;

    let cancelled = false;
    const token = ++cpuTokenRef.current;

    (async () => {
      if (isAudioPlaying) {
        await waitForAudioToFinish(token);
      }
      if (cancelled) return;
      if (cpuTokenRef.current !== token) return;
      if (winner) return;

      const thinkMs =
        CPU_THINK_MIN_MS +
        Math.floor(Math.random() * (CPU_THINK_MAX_MS - CPU_THINK_MIN_MS + 1));

      await waitMs(thinkMs, token);
      if (cancelled) return;
      if (cpuTokenRef.current !== token) return;
      if (winner) return;
      if (turn !== cpuPlayer) return;

      const move = chooseCpuMove(squares, cpuPlayer, humanPlayer);
      if (move === null) return;
      if (squares[move] !== null) return;

      // Execute CPU move (inline to avoid the "cpu turn" guard in handleSquareClick)
      const nextSquares = [...squares];

      if (cpuPlayer === "john") {
        const song = songs?.john?.[johnSongIndex] ?? null;
        nextSquares[move] = { player: "john", song };
        setJohnSongIndex((n) => n + 1);
        playSongSnippetByIdCrossfade(song?.id);
      } else {
        const song = songs?.paul?.[paulSongIndex] ?? null;
        nextSquares[move] = { player: "paul", song };
        setPaulSongIndex((n) => n + 1);
        playSongSnippetByIdCrossfade(song?.id);
      }

      setSquares(nextSquares);
      setTurn(cpuPlayer === "john" ? "paul" : "john");
    })();

    return () => {
      cancelled = true;
    };
  }, [
    humanPlayer,
    cpuPlayer,
    turn,
    winner,
    squares,
    isAudioPlaying,
    johnSongIndex,
    paulSongIndex,
    CPU_THINK_MIN_MS,
    CPU_THINK_MAX_MS,
  ]);

  function handleReset() {
    setSquares(Array(16).fill(null));
    setTurn(null);
    setStarter(null);
    setHumanPlayer(null);
    setJohnSongIndex(0);
    setPaulSongIndex(0);

    cpuTokenRef.current++;

    const cur = currentPlaybackRef.current;
    if (cur?.el) stopPlayback(cur);
    currentPlaybackRef.current = { el: null, source: null, gain: null };
    setIsAudioPlaying(false);

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
      <div className={`modal-overlay ${starter !== null ? "is-hidden" : ""}`} role="dialog" aria-modal="true">
        <div className="modal">
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
          className={`side-image left ${
            isPaulTurn ? "is-active" : ""
          } ${winner === "paul" ? "is-winner" : ""} ${isTie ? "is-tie" : ""}`}
        >
          <span className="side-shadow" aria-hidden="true" />
          <img src="/images/hofner.png" alt="Paul McCartney Hofner Bass" />
        </div>

        <div className="board-area">
          <Board
            squares={squares}
            onSquareClick={handleSquareClick}
            winningLine={winningLine}
            winner={winner}
          />

          <button className="board-reset" type="button" onClick={handleReset}>
            Reset
          </button>
        </div>

        <div
          ref={johnRef}
          className={`side-image right ${
            isJohnTurn ? "is-active" : ""
          } ${winner === "john" ? "is-winner" : ""} ${isTie ? "is-tie" : ""}`}
        >
          <span className="side-shadow" aria-hidden="true" />
          <img src="/images/casino.png" alt="John Lennon Casino Guitar" />
        </div>
      </section>
    </>
  );
}