import { renderHook } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { useClickOutside } from "./useClickOutside";

describe("useClickOutside", () => {
  let element;

  beforeEach(() => {
    element = document.createElement("div");
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("calls onClose when clicking outside the ref element", () => {
    const onClose = jest.fn();
    const ref = { current: element };
    renderHook(() => useClickOutside(ref, onClose));

    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("does NOT call onClose when clicking on the ref element itself", () => {
    const onClose = jest.fn();
    const ref = { current: element };
    renderHook(() => useClickOutside(ref, onClose));

    fireEvent.mouseDown(element);
    expect(onClose).not.toHaveBeenCalled();
  });

  test("does NOT call onClose when clicking on a child of the ref element", () => {
    const onClose = jest.fn();
    const child = document.createElement("span");
    element.appendChild(child);
    const ref = { current: element };
    renderHook(() => useClickOutside(ref, onClose));

    fireEvent.mouseDown(child);
    expect(onClose).not.toHaveBeenCalled();
  });

  test("removes event listener on unmount", () => {
    const spy = jest.spyOn(document, "removeEventListener");
    const ref = { current: element };
    const onClose = jest.fn();
    const { unmount } = renderHook(() => useClickOutside(ref, onClose));
    unmount();
    expect(spy).toHaveBeenCalledWith("mousedown", expect.any(Function));
    spy.mockRestore();
  });

  test("does NOT call onClose when ref.current is null (guard)", () => {
    const onClose = jest.fn();
    const ref = { current: null };
    renderHook(() => useClickOutside(ref, onClose));

    // ref.current is null → handler checks `ref.current &&` first → no call
    fireEvent.mouseDown(document.body);
    expect(onClose).not.toHaveBeenCalled();
  });
});
