import { useState } from "react";
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
    if (first && first.player === squares[b]?.player && first.player === squares[c]?.player) {
      return first.player;
    }
  }

  return null;
}

export default function Game() {
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("john");
  const [johnSongIndex, setJohnSongIndex] = useState(0);
  const [paulSongIndex, setPaulSongIndex] = useState(0);

  const winner = calculateWinner(squares);

  function handleSquareClick(index) {
    if (winner) return;
    if (squares[index] !== null) return;

    const nextSquares = [...squares];
      if (turn === "john") {
        const song = songs.john[johnSongIndex];
        nextSquares[index] = { player: "john", song };

        setJohnSongIndex((n) => n + 1);
      } else {
        const song = songs.paul[paulSongIndex];
        nextSquares[index] = { player: "paul", song };

        setPaulSongIndex((n) => n + 1);
      }

    setSquares(nextSquares);
    setTurn(turn === "john" ? "paul" : "john");
  }

  function handleReset() {
    setSquares(Array(9).fill(null));
    setTurn("john");

    setJohnSongIndex(0);
    setPaulSongIndex(0);
  }

  const prettyTurn = turn === "john" ? "John" : "Paul";
  const prettyWinner = winner === "john" ? "John" : "Paul";

  return (
    <section>
      <p>{winner ? `Winner: ${prettyWinner}` : `Next: ${prettyTurn}`}</p>
      <Board squares={squares} onSquareClick={handleSquareClick} />
      <button type="button" onClick={handleReset}>
        Reset
      </button>
    </section>
  );
}