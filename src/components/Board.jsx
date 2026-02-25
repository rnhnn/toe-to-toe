import Square from "./Square";

export default function Board({ squares, onSquareClick, winningLine }) {
  return (
    <section className="board" aria-label="Game Board">
      {squares.map((value, i) => {
        const isWinningSquare = winningLine?.includes(i);

        return (
          <Square
            key={i}
            index={i}
            value={value}
            isWinning={isWinningSquare}
            onClick={() => onSquareClick(i)}
          />
        );
      })}
    </section>
  );
}