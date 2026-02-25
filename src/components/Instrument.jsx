// src/components/Instrument.jsx
import { forwardRef } from "react";

const Instrument = forwardRef(function Instrument(
  { side, imgSrc, alt, isActive, isWinner, isTie },
  ref
) {
  return (
    <div
      ref={ref}
      className={`side-image ${side} ${isActive ? "is-active" : ""} ${
        isWinner ? "is-winner" : ""
      } ${isTie ? "is-tie" : ""}`}
    >
      <span className="side-shadow" aria-hidden="true" />
      <img src={imgSrc} alt={alt} />
    </div>
  );
});

export default Instrument;