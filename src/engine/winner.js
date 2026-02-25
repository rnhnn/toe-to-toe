// src/engine/winner.js
import { LINES_4X4 } from "./constants";

export function calculateWinnerInfo(squares) {
  for (const line of LINES_4X4) {
    const a = squares[line[0]];
    if (a && line.every((i) => squares[i]?.player === a.player)) return { player: a.player, line };
  }
  return null;
}