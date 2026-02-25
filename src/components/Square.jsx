export default function Square({ index, value, onClick, isWinning }) {
  const playerClass = value ? `square--${value.player}` : "";
  const winClass = isWinning ? "square--win" : "";

  return (
    <button
      className={`square ${playerClass} ${winClass}`}
      type="button"
      onClick={onClick}
    >
      {value ? value.song.title : ""}
    </button>
  );
}