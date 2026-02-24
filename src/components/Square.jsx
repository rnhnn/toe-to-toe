export default function Square({ index, value, onClick }) {
  return (
    <button className="square" type="button" onClick={onClick}>
      {value ?? index}
    </button>
  );
}