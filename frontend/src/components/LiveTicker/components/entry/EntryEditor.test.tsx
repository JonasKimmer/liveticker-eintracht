import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { EntryEditor } from "./EntryEditor";
import { MODES } from "../../constants";

const noop = () => {};

function renderEditor(overrides = {}) {
  const props = {
    value: "",
    onChange: noop,
    onPublish: noop,
    mode: MODES.MANUAL,
    currentMinute: 0,
    playerNames: [],
    ...overrides,
  };
  return render(<EntryEditor {...props} />);
}

/** Stateful Wrapper: simuliert echtes Tippen mit State-Update */
function StatefulEditor({ initialValue = "", playerNames = [], ...rest }) {
  const [value, setValue] = React.useState(initialValue);
  return (
    <EntryEditor
      value={value}
      onChange={setValue}
      mode={MODES.MANUAL}
      playerNames={playerNames}
      {...rest}
    />
  );
}

// ──────────────────────────────────────────────
// Grundstruktur
// ──────────────────────────────────────────────

describe("EntryEditor — Grundstruktur", () => {
  test("rendert Textarea", () => {
    renderEditor();
    expect(screen.getByPlaceholderText("Ticker-Eintrag …")).toBeInTheDocument();
  });

  test("zeigt Veröffentlichen-Button", () => {
    renderEditor();
    expect(screen.getByRole("button", { name: /Annehmen/ })).toBeInTheDocument();
  });

  test("Veröffentlichen deaktiviert bei leerem Wert", () => {
    renderEditor({ value: "" });
    expect(screen.getByRole("button", { name: /Annehmen/ })).toBeDisabled();
  });

  test("Veröffentlichen aktiv bei gesetztem Wert", () => {
    renderEditor({ value: "Eintrag" });
    expect(screen.getByRole("button", { name: /Annehmen/ })).not.toBeDisabled();
  });

  test("zeigt Abbrechen-Button wenn onCancel übergeben", () => {
    renderEditor({ onCancel: jest.fn() });
    expect(screen.getByText("Abbrechen")).toBeInTheDocument();
  });

  test("kein Abbrechen-Button ohne onCancel", () => {
    renderEditor();
    expect(screen.queryByText("Abbrechen")).not.toBeInTheDocument();
  });

  test("zeigt Label 'Manueller Eintrag' im MANUAL-Modus", () => {
    renderEditor({ mode: MODES.MANUAL });
    expect(screen.getByText(/Manueller Eintrag/)).toBeInTheDocument();
  });

  test("zeigt Hint-Text bei leerem Eingabefeld", () => {
    renderEditor({ value: "" });
    expect(screen.getByText(/alle Commands/i)).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// Minute-Anzeige
// ──────────────────────────────────────────────

describe("EntryEditor — Minute", () => {
  test("zeigt –' wenn currentMinute = 0", () => {
    renderEditor({ currentMinute: 0 });
    expect(screen.getByText("–'")).toBeInTheDocument();
  });

  test("zeigt Minute wenn currentMinute > 0", () => {
    renderEditor({ currentMinute: 42 });
    expect(screen.getByText("42'")).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// Command-Palette
// ──────────────────────────────────────────────

describe("EntryEditor — Command Palette", () => {
  test("öffnet Palette bei Tippen von /", () => {
    render(<StatefulEditor />);
    const textarea = screen.getByPlaceholderText("Ticker-Eintrag …");
    fireEvent.change(textarea, { target: { value: "/" } });
    expect(screen.getByText("/g")).toBeInTheDocument();
  });

  test("filtert Palette beim Tippen von /g — zeigt alle /g*-Commands", () => {
    render(<StatefulEditor />);
    const textarea = screen.getByPlaceholderText("Ticker-Eintrag …");
    fireEvent.change(textarea, { target: { value: "/g" } });
    // /g, /gelb starten beide mit "/g"
    expect(screen.getAllByText("/g").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("/gelb")).toBeInTheDocument();
    // /rot beginnt nicht mit "/g" → nicht sichtbar
    expect(screen.queryByText("/rot")).not.toBeInTheDocument();
  });

  test("keine Palette bei Freitext", () => {
    renderEditor({ value: "freier text" });
    expect(screen.queryByText("/g")).not.toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// Name-Autocomplete
// ──────────────────────────────────────────────

describe("EntryEditor — Name Autocomplete", () => {
  test("zeigt Namensvorschläge bei passender Eingabe", () => {
    render(<StatefulEditor playerNames={["Müller", "Musiala", "Kimmich"]} />);
    const textarea = screen.getByPlaceholderText("Ticker-Eintrag …");
    fireEvent.change(textarea, { target: { value: "/g Mül" } });
    // Name-Dropdown erscheint (Text über mehrere Spans verteilt, daher container-Check)
    expect(screen.getByText("👤")).toBeInTheDocument();
    expect(screen.queryByText(/Kimmich/)).not.toBeInTheDocument();
  });

  test("zeigt keine Vorschläge wenn keine Übereinstimmung", () => {
    render(<StatefulEditor playerNames={["Müller", "Musiala"]} />);
    const textarea = screen.getByPlaceholderText("Ticker-Eintrag …");
    fireEvent.change(textarea, { target: { value: "/g Xyz" } });
    expect(screen.queryByText("👤")).not.toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// Preview
// ──────────────────────────────────────────────

describe("EntryEditor — Live Preview", () => {
  test("zeigt Vorschau für gültigen /g Command", () => {
    renderEditor({ value: "/g Müller EIN", currentMinute: 30 });
    expect(screen.getByText(/Vorschau/)).toBeInTheDocument();
    expect(screen.getByText(/TOR/)).toBeInTheDocument();
  });

  test("zeigt Freitext-Modus für unvollständigen Command", () => {
    renderEditor({ value: "/g Müller", currentMinute: 5 });
    expect(screen.getByText(/Freitext/)).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// Publish-Callback
// ──────────────────────────────────────────────

describe("EntryEditor — Publish", () => {
  test("ruft onPublish beim Klick auf Veröffentlichen", () => {
    const onPublish = jest.fn();
    const onChange = jest.fn();
    renderEditor({ value: "Freier Text", onPublish, onChange });
    fireEvent.click(screen.getByRole("button", { name: /Annehmen/ }));
    expect(onPublish).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Freier Text" }),
    );
  });

  test("onPublish mit Command-Icon für /gelb", () => {
    const onPublish = jest.fn();
    const onChange = jest.fn();
    renderEditor({
      value: "/gelb Hinteregger EIN",
      currentMinute: 55,
      onPublish,
      onChange,
    });
    fireEvent.click(screen.getByRole("button", { name: /Annehmen/ }));
    expect(onPublish).toHaveBeenCalledWith(
      expect.objectContaining({ icon: "🟨" }),
    );
  });
});
