import { render, screen, fireEvent } from "@testing-library/react";
import { useListKeyboard } from "./useListKeyboard";

// Test component that surfaces hook state as DOM attributes
function TestList({ items, onSelect, onClose }) {
  const { activeIdx, onKeyDown } = useListKeyboard(items, { onSelect, onClose });
  return (
    <div data-testid="list" tabIndex={0} onKeyDown={onKeyDown}>
      {items.map((item, i) => (
        <div
          key={item}
          data-testid={`item-${i}`}
          data-active={String(i === activeIdx)}
        >
          {item}
        </div>
      ))}
    </div>
  );
}

function pressKey(element, key) {
  fireEvent.keyDown(element, { key });
}

function setup(items) {
  const onSelect = jest.fn();
  const onClose = jest.fn();
  render(<TestList items={items} onSelect={onSelect} onClose={onClose} />);
  const list = screen.getByTestId("list");
  list.focus();
  return { onSelect, onClose, list };
}

describe("useListKeyboard", () => {
  test("initially first item is active", () => {
    render(<TestList items={["a", "b", "c"]} onSelect={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByTestId("item-0").dataset.active).toBe("true");
    expect(screen.getByTestId("item-1").dataset.active).toBe("false");
  });

  test("ArrowDown moves active to next item", () => {
    const { list } = setup(["a", "b", "c"]);
    pressKey(list, "ArrowDown");
    expect(screen.getByTestId("item-0").dataset.active).toBe("false");
    expect(screen.getByTestId("item-1").dataset.active).toBe("true");
  });

  test("ArrowDown does not exceed last item", () => {
    const { list } = setup(["a", "b"]);
    pressKey(list, "ArrowDown"); // → 1
    pressKey(list, "ArrowDown"); // stays 1
    expect(screen.getByTestId("item-1").dataset.active).toBe("true");
  });

  test("ArrowUp decrements active", () => {
    const { list } = setup(["a", "b", "c"]);
    pressKey(list, "ArrowDown"); // → 1
    pressKey(list, "ArrowDown"); // → 2
    pressKey(list, "ArrowUp");   // → 1
    expect(screen.getByTestId("item-1").dataset.active).toBe("true");
    expect(screen.getByTestId("item-2").dataset.active).toBe("false");
  });

  test("ArrowUp floors at 0", () => {
    const { list } = setup(["a", "b"]);
    pressKey(list, "ArrowUp"); // already 0, stays 0
    expect(screen.getByTestId("item-0").dataset.active).toBe("true");
  });

  test("Enter calls onSelect with active item", () => {
    const { list, onSelect } = setup(["apple", "banana", "cherry"]);
    pressKey(list, "Enter");
    expect(onSelect).toHaveBeenCalledWith("apple");
  });

  test("Enter selects correct item after ArrowDown", () => {
    const { list, onSelect } = setup(["apple", "banana", "cherry"]);
    pressKey(list, "ArrowDown"); // → 1
    pressKey(list, "Enter");
    expect(onSelect).toHaveBeenCalledWith("banana");
  });

  test("Escape calls onClose", () => {
    const { list, onClose } = setup(["a"]);
    pressKey(list, "Escape");
    expect(onClose).toHaveBeenCalled();
  });

  test("does not call onSelect for empty list", () => {
    const onSelect = jest.fn();
    render(<TestList items={[]} onSelect={onSelect} onClose={jest.fn()} />);
    const list = screen.getByTestId("list");
    list.focus();
    pressKey(list, "Enter");
    expect(onSelect).not.toHaveBeenCalled();
  });
});
