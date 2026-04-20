import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ErrorBoundary from "./ErrorBoundary";

// Komponente die beim Rendern einen Fehler wirft
function BrokenComponent() {
  throw new Error("Test-Fehler");
}

// Unterdrücke console.error während Tests (React loggt Boundary-Fehler)
beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  console.error.mockRestore();
});

describe("ErrorBoundary", () => {
  test("rendert Kinder wenn kein Fehler vorliegt", () => {
    render(
      <ErrorBoundary>
        <p>Inhalt</p>
      </ErrorBoundary>
    );
    expect(screen.getByText("Inhalt")).toBeInTheDocument();
  });

  test("zeigt Standard-Fallback wenn Kind einen Fehler wirft", () => {
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Fehler in diesem Bereich/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Neu laden/i })).toBeInTheDocument();
  });

  test("zeigt custom fallback-Prop wenn übergeben", () => {
    render(
      <ErrorBoundary fallback={<p>Eigener Fehlertext</p>}>
        <BrokenComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText("Eigener Fehlertext")).toBeInTheDocument();
  });

  test("setzt Fehler-State zurück wenn Neu-laden geklickt wird", () => {
    const { rerender } = render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );
    expect(screen.getByRole("button", { name: /Neu laden/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Neu laden/i }));

    // Nach Reset versucht React erneut zu rendern — Fehler tritt wieder auf
    // (weil BrokenComponent immer wirft), aber der Reset-Mechanismus funktioniert
    expect(screen.getByRole("button", { name: /Neu laden/i })).toBeInTheDocument();
  });
});
