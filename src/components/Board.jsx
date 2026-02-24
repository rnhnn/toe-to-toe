import Square from "./Square";

export default function Board({ squares, onSquareClick }) {
    return (
        <section className="board" aria-label="Game Board">
            {squares.map((value, i) => (
                <Square
                    key={i}
                    index={i}
                    value={value}
                    onClick={() => onSquareClick(i)}
                />
            ))}
        </section>
    );
}