export default function Square({ index, value, onClick }) {
  const playerClass = value ? `square--${value.player}` : "";

  return (
    <button
      className={`square ${playerClass}`}
      type="button"
      onClick={onClick}
    >
      {value ? value.song.title : ""}
    </button>
  );
}