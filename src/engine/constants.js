// src/engine/constants.js

export const SIZE = 4;
export const TOTAL = SIZE * SIZE;

export const LINES_4X4 = (() => {
  const lines = [];
  for (let r = 0; r < SIZE; r++) lines.push([r * 4 + 0, r * 4 + 1, r * 4 + 2, r * 4 + 3]);
  for (let c = 0; c < SIZE; c++) lines.push([0 * 4 + c, 1 * 4 + c, 2 * 4 + c, 3 * 4 + c]);
  lines.push([0, 5, 10, 15], [3, 6, 9, 12]);
  return lines;
})();

export const CENTER = new Set([5, 6, 9, 10]);
export const CORNERS = new Set([0, 3, 12, 15]);

export const CPU_THINK_MIN_MS = 500;
export const CPU_THINK_MAX_MS = 1100;