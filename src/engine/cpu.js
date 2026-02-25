import { CENTER, CORNERS, LINES_4X4 } from "./constants";

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

export function chooseCpuMove(squares, cpuPlayer, humanPlayer) {
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