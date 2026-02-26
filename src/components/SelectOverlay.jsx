// src/components/SelectOverlay.jsx
export default function SelectOverlay({ isOpen, onSelect }) {
  return (
    <div className={`modal-overlay ${isOpen ? "" : "is-hidden"}`} role="dialog" aria-modal="true">
      <div className="modal">
        <h2 className="modal-title">Select Player:</h2>
        <div className="modal-actions modal-actions--portraits">
          <button
            type="button"
            className="starter-button starter-button--paul"
            onClick={() => onSelect("paul")}
            aria-label="Play as Paul McCartney (CPU is John)"
          >
            <img src="/images/paul.png" alt="Paul McCartney portrait" />
          </button>

          <button
            type="button"
            className="starter-button starter-button--john"
            onClick={() => onSelect("john")}
            aria-label="Play as John Lennon (CPU is Paul)"
          >
            <img src="/images/john.png" alt="John Lennon portrait" />
          </button>
        </div>
      </div>
    </div>
  );
}