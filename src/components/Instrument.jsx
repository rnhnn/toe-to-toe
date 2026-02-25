// src/components/Instrument.jsx
import { forwardRef } from "react";

const Instrument = forwardRef(function Instrument(
  { side, imgSrc, alt, isActive, isWinner, isTie },
  ref
) {
  return (
    <div
      ref={ref}
      className={`instrument ${side} ${isActive ? "is-active" : ""} ${
        isWinner ? "is-winner" : ""
      } ${isTie ? "is-tie" : ""}`}
    >
      <span className="instrument-shadow" aria-hidden="true" />
      <img src={imgSrc} alt={alt} />
    </div>
  );
});

export default Instrument;