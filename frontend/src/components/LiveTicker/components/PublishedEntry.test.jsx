import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PublishedEntry } from "./PublishedEntry";

const baseEntry = { liveTickerEventType: "goal", time: 32 };
const baseTicker = {
  id: 1,
  text: "Tor! Müller trifft ins Glück.",
  style: "neutral",
  llm_model: "mock",
  status: "published",
};

// ──────────────────────────────────────────────
// AI-generierter Eintrag
// ──────────────────────────────────────────────

describe("PublishedEntry — AI-Eintrag", () => {
  test("zeigt Ticker-Text an", () => {
    render(<PublishedEntry entry={baseEntry} tickerText={baseTicker} />);
    expect(screen.getByText("Tor! Müller trifft ins Glück.")).toBeInTheDocument();
  });

  test("zeigt Spielminute an", () => {
    render(<PublishedEntry entry={baseEntry} tickerText={baseTicker} />);
    expect(screen.getByText(/32'/)).toBeInTheDocument();
  });

  test("zeigt ⚽ Icon für Tor", () => {
    render(<PublishedEntry entry={baseEntry} tickerText={baseTicker} />);
    expect(screen.getByText("⚽")).toBeInTheDocument();
  });

  test("gibt null zurück ohne tickerText", () => {
    const { container } = render(<PublishedEntry entry={baseEntry} tickerText={null} />);
    expect(container.firstChild).toBeNull();
  });

  test("zeigt Bearbeiten-Button wenn onEdit übergeben", () => {
    render(
      <PublishedEntry entry={baseEntry} tickerText={baseTicker} onEdit={jest.fn()} />
    );
    expect(screen.getByTitle("Bearbeiten")).toBeInTheDocument();
  });

  test("kein Bearbeiten-Button ohne onEdit", () => {
    render(<PublishedEntry entry={baseEntry} tickerText={baseTicker} />);
    expect(screen.queryByTitle("Bearbeiten")).not.toBeInTheDocument();
  });

  test("zeigt Löschen-Button wenn onDelete übergeben", () => {
    render(
      <PublishedEntry entry={baseEntry} tickerText={baseTicker} onDelete={jest.fn()} />
    );
    expect(screen.getByTitle("Löschen")).toBeInTheDocument();
  });

  test("Bearbeiten-Klick öffnet Textarea", () => {
    render(
      <PublishedEntry entry={baseEntry} tickerText={baseTicker} onEdit={jest.fn()} />
    );
    fireEvent.click(screen.getByTitle("Bearbeiten"));
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  test("Abbrechen schließt Textarea wieder", () => {
    render(
      <PublishedEntry entry={baseEntry} tickerText={baseTicker} onEdit={jest.fn()} />
    );
    fireEvent.click(screen.getByTitle("Bearbeiten"));
    fireEvent.click(screen.getByText("Abbrechen"));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  test("zeigt Modell-Metainfo", () => {
    render(<PublishedEntry entry={baseEntry} tickerText={baseTicker} />);
    expect(screen.getByText(/mock/)).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// Manueller Eintrag (isManual=true)
// ──────────────────────────────────────────────

describe("PublishedEntry — Manueller Eintrag", () => {
  const manualTicker = { ...baseTicker, icon: "📝", minute: 45, phase: "FirstHalf" };

  test("rendert mit manuell-Meta", () => {
    render(
      <PublishedEntry entry={baseEntry} tickerText={manualTicker} isManual />
    );
    expect(screen.getByText("Tor! Müller trifft ins Glück.")).toBeInTheDocument();
    expect(screen.getByText(/manuell/)).toBeInTheDocument();
  });

  test("zeigt Minute", () => {
    render(
      <PublishedEntry entry={baseEntry} tickerText={manualTicker} isManual />
    );
    expect(screen.getByText(/45'/)).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// Prematch-Eintrag (isPrematch=true)
// ──────────────────────────────────────────────

describe("PublishedEntry — Prematch", () => {
  test("zeigt 'Vor' als Minuten-Label", () => {
    render(
      <PublishedEntry entry={baseEntry} tickerText={baseTicker} isPrematch />
    );
    expect(screen.getByText("Vor")).toBeInTheDocument();
  });

  test("zeigt Prematch-Text", () => {
    render(
      <PublishedEntry entry={baseEntry} tickerText={baseTicker} isPrematch />
    );
    expect(screen.getByText(baseTicker.text)).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// Verschiedene Event-Typen → Icons
// ──────────────────────────────────────────────

describe("PublishedEntry — Event Icons", () => {
  test.each([
    ["yellow_card", "🟨"],
    ["red_card", "🟥"],
    ["substitution", "🔄"],
  ])("%s → %s Icon", (eventType, icon) => {
    const entry = { liveTickerEventType: eventType, time: 60 };
    render(<PublishedEntry entry={entry} tickerText={baseTicker} />);
    expect(screen.getByText(icon)).toBeInTheDocument();
  });
});
