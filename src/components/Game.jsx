import { useState } from "react";
import Board from "./Board";

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
    if (first && first === squares[b] && first === squares[c]) {
      return first; // "john" or "paul"
    }
  }

  return null;
}

export default function Game() {
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("john");

  const winner = calculateWinner(squares);

  function handleSquareClick(index) {
    if (winner) return;
    if (squares[index] !== null) return;

    const nextSquares = [...squares];
    nextSquares[index] = turn;

    setSquares(nextSquares);
    setTurn(turn === "john" ? "paul" : "john");
  }

  function handleReset() {
    setSquares(Array(9).fill(null));
    setTurn("john");
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