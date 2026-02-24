import { useEffect, useRef, useState } from "react";
import Board from "./Board";
import songs from "../data/songs.json";

function calculateWinner(squares) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [a, b, c] of lines) {
    const first = squares[a];
    if (
      first &&
      first.player === squares[b]?.player &&
      first.player === squares[c]?.player
    ) {
      return first.player;
    }
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
  const [squares, setSquares] = useState(Array(9).fill(null));
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
    } else {
      const song = songs?.paul?.[paulSongIndex] ?? null;
      nextSquares[index] = { player: "paul", song };
      setPaulSongIndex((n) => n + 1);
    }

    setSquares(nextSquares);
    setTurn(turn === "john" ? "paul" : "john");
  }

  function handleReset() {
    setSquares(Array(9).fill(null));
    setTurn(null);
    setStarter(null);
    setJohnSongIndex(0);
    setPaulSongIndex(0);

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