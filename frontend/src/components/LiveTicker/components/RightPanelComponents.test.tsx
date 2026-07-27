import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Collapsible, CollapsibleCat } from "./Collapsible";
import { PlayerBadges } from "./stats/PlayerBadges";
import { StatRow } from "./stats/StatRow";
import userEvent from "@testing-library/user-event";

// ──────────────────────────────────────────────
// StatRow
// ──────────────────────────────────────────────

describe("StatRow", () => {
  test("zeigt Label, Heim- und Auswärtswert", () => {
    render(<StatRow label="Schüsse" home="8" away="5" />);
    expect(screen.getByText("Schüsse")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  test("rendert Balken wenn homeVal und awayVal gesetzt", () => {
    const { container } = render(
      <StatRow
        label="Ballbesitz"
        home="60%"
        away="40%"
        homeVal={60}
        awayVal={40}
      />,
    );
    expect(container.querySelector(".lt-stat-bar__home")).toBeInTheDocument();
    expect(container.querySelector(".lt-stat-bar__away")).toBeInTheDocument();
  });

  test("rendert keinen Balken ohne homeVal/awayVal", () => {
    const { container } = render(<StatRow label="Fouls" home="3" away="4" />);
    expect(
      container.querySelector(".lt-stat-bar__home"),
    ).not.toBeInTheDocument();
  });

  test("standalone rendert separaten Balken-Block", () => {
    const { container } = render(
      <StatRow
        label="x"
        home="50"
        away="50"
        homeVal={50}
        awayVal={50}
        standalone
      />,
    );
    // standalone nutzt lt-stat-bar ohne --inline
    const bar = container.querySelector(".lt-stat-bar");
    expect(bar).toBeInTheDocument();
    expect(bar.classList.contains("lt-stat-bar--inline")).toBe(false);
  });

  test("gleichgewichteter Balken bei total=0 → 50/50", () => {
    const { container } = render(
      <StatRow
        label="x"
        home="0"
        away="0"
        homeVal={0}
        awayVal={0}
        standalone
      />,
    );
    const homeBar = container.querySelector(".lt-stat-bar__home");
    expect(homeBar.style.width).toBe("50%");
  });
});

// ──────────────────────────────────────────────
// PlayerBadges
// ──────────────────────────────────────────────

describe("PlayerBadges", () => {
  const baseEntry = { playerId: 1, status: "Start" };

  test("gibt null zurück wenn keine Badges", () => {
    const { container } = render(<PlayerBadges entry={baseEntry} />);
    expect(container.firstChild).toBeNull();
  });

  test("zeigt Torball wenn numberOfGoals > 0", () => {
    const entry = { ...baseEntry, numberOfGoals: 2 };
    const { container } = render(<PlayerBadges entry={entry} />);
    const balls = container.querySelectorAll(".lt-lineup-badge");
    expect(balls).toHaveLength(2);
    expect(balls[0].textContent).toBe("⚽");
  });

  test("zeigt gelbe Karte aus entry.hasYellowCard", () => {
    const entry = { ...baseEntry, hasYellowCard: true };
    render(<PlayerBadges entry={entry} />);
    expect(screen.getByText("🟨")).toBeInTheDocument();
  });

  test("zeigt rote Karte aus entry.hasRedCard", () => {
    const entry = { ...baseEntry, hasRedCard: true };
    render(<PlayerBadges entry={entry} />);
    expect(screen.getByText("🟥")).toBeInTheDocument();
  });

  test("zeigt Auswechslung aus stat.cardsYellow via stat", () => {
    const entry = { ...baseEntry };
    const stat = { cardsYellow: 1, goals: 0, cardsRed: 0, minutes: 70 };
    render(<PlayerBadges entry={entry} stat={stat} />);
    expect(screen.getByText("🟨")).toBeInTheDocument();
  });

  test("zeigt Einwechslung für Sub-Status mit subOnMin", () => {
    const entry = { playerId: 5, status: "Sub" };
    const subMinuteMap = { in_5: 63 };
    render(<PlayerBadges entry={entry} subMinuteMap={subMinuteMap} />);
    expect(screen.getByTitle("Eingewechselt")).toBeInTheDocument();
    expect(screen.getByText(/↑63'/)).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// Collapsible
// ──────────────────────────────────────────────

describe("Collapsible", () => {
  test("zeigt Inhalt wenn defaultOpen=true", () => {
    render(
      <Collapsible title="Aufstellung">
        <p>Inhalt</p>
      </Collapsible>,
    );
    expect(screen.getByText("Inhalt")).toBeVisible();
  });

  test("versteckt Inhalt wenn defaultOpen=false", () => {
    const { container } = render(
      <Collapsible title="Statistiken" defaultOpen={false}>
        <p>Versteckter Inhalt</p>
      </Collapsible>,
    );
    const content = container.querySelector("div[style]");
    expect(content.style.display).toBe("none");
  });

  test("Toggle öffnet/schließt beim Klick", async () => {
    const { container } = render(
      <Collapsible title="Toggle-Test" defaultOpen={true}>
        <p>Inhalt</p>
      </Collapsible>,
    );
    const btn = screen.getByText(/Toggle-Test/);
    await userEvent.click(btn);
    const content = container.querySelector("div[style]");
    expect(content.style.display).toBe("none");

    await userEvent.click(btn);
    expect(content.style.display).toBe("");
  });

  test("zeigt Pfeil-Indikator ▲/▼", async () => {
    render(
      <Collapsible title="Pfeil">
        <span />
      </Collapsible>,
    );
    expect(screen.getByText("▲")).toBeInTheDocument();
    await userEvent.click(screen.getByText(/Pfeil/));
    expect(screen.getByText("▼")).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// CollapsibleCat
// ──────────────────────────────────────────────

describe("CollapsibleCat", () => {
  test("zeigt Kinder wenn offen", () => {
    render(
      <CollapsibleCat title="Kategorie">
        <span>Kind</span>
      </CollapsibleCat>,
    );
    expect(screen.getByText("Kind")).toBeInTheDocument();
  });

  test("versteckt Kinder wenn geschlossen", async () => {
    render(
      <CollapsibleCat title="Kat" defaultOpen={false}>
        <span>Unsichtbar</span>
      </CollapsibleCat>,
    );
    expect(screen.queryByText("Unsichtbar")).not.toBeInTheDocument();
  });

  test("Toggle auf Klick", async () => {
    render(
      <CollapsibleCat title="Kat" defaultOpen={false}>
        <span>Inhalt</span>
      </CollapsibleCat>,
    );
    expect(screen.queryByText("Inhalt")).not.toBeInTheDocument();
    await userEvent.click(screen.getByText(/Kat/));
    expect(screen.getByText("Inhalt")).toBeInTheDocument();
  });
});
