import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom"; // For extended Jest DOM matchers
import ItemDetail from "../pages/ItemDetail"; // Adjust the import path as needed

// --- Mock external dependencies ---

jest.mock("react-router-dom", () => ({
  useParams: jest.fn(),
}));

jest.mock("../components/spinner", () => {
  return function MockSpinner() {
    return <div data-testid="spinner">Loading Spinner</div>;
  };
});

global.fetch = jest.fn();

// --- Test Suite ---

describe("ItemDetail Component", () => {
  const mockItem = {
    id: "123",
    name: "Fancy Gadget",
    price: 199.99,
    category: "Electronics",
  };

  const { useParams } = require("react-router-dom"); // Get the mocked useParams
  let consoleErrorSpy; // To suppress console.error during tests

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers(); // Enable Jest's fake timers
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.runOnlyPendingTimers(); // Clear any pending timers
    jest.useRealTimers(); // Restore real timers
    consoleErrorSpy.mockRestore(); // Restore original console.error
  });

  // --- Test Cases ---

  test("should display spinner initially", () => {
    useParams.mockReturnValue({ id: "123" });
    render(<ItemDetail />);
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.queryByText(mockItem.name)).not.toBeInTheDocument();
  });

  test("should fetch and display item details after delay on successful API call", async () => {
    useParams.mockReturnValue({ id: mockItem.id });
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockItem),
    });

    render(<ItemDetail />);
    expect(screen.getByTestId("spinner")).toBeInTheDocument();

    // The key change: await the act block
    await act(async () => {
      jest.advanceTimersByTime(500); // Advance timers to trigger setTimeout
      // Since fetchItem is async, we await the promise chain to resolve
      // and ensure all state updates (setItem, setLoading(false)) are processed within this act.
      // `await Promise.resolve()` ensures microtasks are flushed.
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      `http://localhost:3001/api/items/${mockItem.id}`
    );
    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
    expect(screen.getByText(mockItem.name)).toBeInTheDocument();


    
    expect(screen.getByText(`${mockItem.category}`)).toBeInTheDocument();

     expect(screen.getByText(`$${mockItem.price}`)).toBeInTheDocument();
    expect(
      screen.queryByText(`No item with ID ${mockItem.id} found.`)
    ).not.toBeInTheDocument();
  });

  test('should display "No item found" message on 404 API error', async () => {
    const nonExistentId = "999";
    useParams.mockReturnValue({ id: nonExistentId });
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: "Item not found" }),
    });

    render(<ItemDetail />);
    expect(screen.getByTestId("spinner")).toBeInTheDocument();

    // The key change: await the act block
    await act(async () => {
      jest.advanceTimersByTime(500);
      await Promise.resolve(); // Flush microtasks for the fetch error
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      `http://localhost:3001/api/items/${nonExistentId}`
    );
    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
    expect(
      screen.getByText(`No item with ID ${nonExistentId} found.`)
    ).toBeInTheDocument();
    expect(screen.queryByText(mockItem.name)).not.toBeInTheDocument();
  });

  test('should display "No item found" message on network error during fetch', async () => {
    const errorId = "abc";
    useParams.mockReturnValue({ id: errorId });
    fetch.mockRejectedValueOnce(new Error("Network is down"));

    render(<ItemDetail />);
    expect(screen.getByTestId("spinner")).toBeInTheDocument();

    // The key change: await the act block
    await act(async () => {
      jest.advanceTimersByTime(500);
      await Promise.resolve(); // Flush microtasks for the rejected promise
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      `http://localhost:3001/api/items/${errorId}`
    );
    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
    expect(
      screen.getByText(`No item with ID ${errorId} found.`)
    ).toBeInTheDocument();
  });

  test("should clear timeout on component unmount before fetch fires", async () => {
    const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
    useParams.mockReturnValue({ id: "cleanup-id" });

    const { unmount } = render(<ItemDetail />);
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();

    // Unmount the component. This will cause useEffect's cleanup function to run.
    act(() => {
      // unmount itself might need to be wrapped for some side-effects
      unmount();
    });

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);

    // Advance timers. Fetch should NOT be called as timeout was cleared.
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(fetch).not.toHaveBeenCalled(); // Verify fetch was NOT called
    clearTimeoutSpy.mockRestore();
  });
});
