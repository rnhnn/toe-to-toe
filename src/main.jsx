import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Game from "./components/Game";
import "./Game.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <main className="game">
      <Game />
    </main>
  </StrictMode>
);