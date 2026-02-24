import Square from "./Square";

export default function Board() {
    return (
        <section className="board" aria-label="Game Board">
            {Array.from({ length: 9 }).map((_, i) => (
                <Square key={i} index={i} />
            ))}
        </section>
    );
}