import { useEffect, useMemo, useRef, useState } from "react";
import Board from "./Board";
import songs from "../data/songs.json";

import { TOTAL, CPU_THINK_MIN_MS, CPU_THINK_MAX_MS } from "../engine/constants";
import { calculateWinnerInfo } from "../engine/winner";
import { chooseCpuMove } from "../engine/cpu";

import { useSmoothActiveFloat } from "../hooks/useSmoothActiveFloat";
import { useCrossfadeAudio } from "../hooks/useCrossfadeAudio";

import SelectOverlay from "./SelectOverlay";
import Instrument from "./Instrument";

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

  const handleSelectStarter = (player) => {
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
      <SelectOverlay isOpen={starter === null} onSelect={handleSelectStarter} />

      <section className="game-layout">
        <Instrument
          ref={paulRef}
          side="left"
          imgSrc="/images/hofner.png"
          alt="Paul McCartney Hofner Bass"
          isActive={isPaulTurn}
          isWinner={winner === "paul"}
          isTie={isTie}
        />

        <div className="board-area">
          <Board squares={squares} onSquareClick={handleSquareClick} winningLine={winningLine} winner={winner} />

          <button className="board-reset" type="button" onClick={handleReset}>
            Reset
          </button>
        </div>

        <Instrument
          ref={johnRef}
          side="right"
          imgSrc="/images/casino.png"
          alt="John Lennon Casino Guitar"
          isActive={isJohnTurn}
          isWinner={winner === "john"}
          isTie={isTie}
        />
      </section>
    </>
  );
}