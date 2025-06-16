import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { DataProvider, useData } from "../state/DataContext"; // Updated import path


import "jest-fetch-mock";

describe("DataProvider and useData Hook", () => {
  // Clear all mocks before each test to ensure test isolation
  beforeEach(() => {
    fetch.resetMocks();
  });

  // A helper component to consume the context for testing
  function TestComponent() {
    const { items, loading, error, paginationInfo, fetchItems } = useData();

    // Render current state for assertions
    return (
      <div>
        <span data-testid="loading">
          {loading ? "Loading..." : "Not Loading"}
        </span>
        <span data-testid="error">{error ? error.message : "No Error"}</span>
        <ul data-testid="items-list">
          {items.map((item) => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
        <div data-testid="pagination-info">
          Page: {paginationInfo.currentPage}, Items per page:{" "}
          {paginationInfo.itemsPerPage}, Total items:{" "}
          {paginationInfo.totalItems}, Total pages: {paginationInfo.totalPages},
          Has previous: {paginationInfo.hasPreviousPage.toString()}, Has next:{" "}
          {paginationInfo.hasNextPage.toString()}
        </div>
        {/* Buttons to trigger fetches with different parameters */}
        <button onClick={() => fetchItems(1, 2, "initial")}>
          Fetch Initial
        </button>
        <button onClick={() => fetchItems(2, 2, "second-page")}>
          Fetch Second Page
        </button>
        <button onClick={() => fetchItems(1, 2, "search-term")}>
          Fetch Search Term
        </button>
      </div>
    );
  }

  it("should provide initial context values", () => {
    render(
      <DataProvider>
        <TestComponent />
      </DataProvider>
    );

    // Assert initial state
    expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading");
    expect(screen.getByTestId("error")).toHaveTextContent("No Error");
    expect(screen.getByTestId("items-list")).toBeEmptyDOMElement();
    expect(screen.getByTestId("pagination-info")).toHaveTextContent(
      "Page: 1, Items per page: 2, Total items: 0, Total pages: 0, Has previous: false, Has next: false"
    );
  });

  it("should fetch items successfully and update state", async () => {
    const mockData = {
      items: [
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
      ],
      currentPage: 1,
      itemsPerPage: 2,
      totalItems: 4,
      totalPages: 2,
      hasPreviousPage: false,
      hasNextPage: true,
    };

    // Mock a successful fetch response
    fetch.mockResponseOnce(JSON.stringify(mockData), { status: 200 });

    render(
      <DataProvider>
        <TestComponent />
      </DataProvider>
    );

    // Simulate clicking the fetch button
    await act(async () => {
      screen.getByText("Fetch Initial").click();
    });

    // Wait for the fetch to complete and state to update
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading"); // Assert loading is false after completion
      expect(screen.getByTestId("error")).toHaveTextContent("No Error");
      expect(screen.getByTestId("items-list")).toHaveTextContent("Item 1");
      expect(screen.getByTestId("items-list")).toHaveTextContent("Item 2");
      expect(screen.getByTestId("pagination-info")).toHaveTextContent(
        "Page: 1, Items per page: 2, Total items: 4, Total pages: 2, Has previous: false, Has next: true"
      );
    });

    // Verify the URL was called correctly
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/items?page=1&limit=2&q=initial"
    );
  });

  it("should handle HTTP error responses", async () => {
    // Mock an HTTP error response (e.g., 500 Internal Server Error)
    fetch.mockResponseOnce(
      JSON.stringify({ message: "Internal Server Error" }),
      { status: 500 }
    );

    // Spy on console.error to ensure it's called
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      <DataProvider>
        <TestComponent />
      </DataProvider>
    );

    await act(async () => {
      screen.getByText("Fetch Initial").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading");
      expect(screen.getByTestId("error")).toHaveTextContent(
        "Internal Server Error"
      ); // Updated expectation to match mock
      expect(screen.getByTestId("items-list")).toBeEmptyDOMElement(); // Items should be cleared
      expect(screen.getByTestId("pagination-info")).toHaveTextContent(
        // Pagination should be reset
        "Page: 1, Items per page: 2, Total items: 0, Total pages: 0, Has previous: false, Has next: false"
      );
    });

    // Verify console.error was called
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to fetch items:",
      expect.any(Error) // Expect an error object
    );

    consoleErrorSpy.mockRestore(); // Restore original console.error
  });

  it("should handle network errors (e.g., fetch throws an error)", async () => {
    // Mock fetch to reject with an error, simulating a network issue
    fetch.mockRejectOnce(new Error("Network is down"));

    // Spy on console.error to ensure it's called
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      <DataProvider>
        <TestComponent />
      </DataProvider>
    );

    await act(async () => {
      screen.getByText("Fetch Initial").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading");
      expect(screen.getByTestId("error")).toHaveTextContent("Network is down"); // Check for network error message
      expect(screen.getByTestId("items-list")).toBeEmptyDOMElement(); // Items should be cleared
      expect(screen.getByTestId("pagination-info")).toHaveTextContent(
        // Pagination should be reset
        "Page: 1, Items per page: 2, Total items: 0, Total pages: 0, Has previous: false, Has next: false"
      );
    });

    // Verify console.error was called
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to fetch items:",
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore(); // Restore original console.error
  });

  it("should allow fetching items with different pagination or search parameters", async () => {
    const mockDataPage1 = {
      items: [
        { id: 1, name: "Initial Item 1" },
        { id: 2, name: "Initial Item 2" },
      ],
      currentPage: 1,
      itemsPerPage: 2,
      totalItems: 6,
      totalPages: 3,
      hasPreviousPage: false,
      hasNextPage: true,
    };

    const mockDataPage2 = {
      items: [
        { id: 3, name: "Page 2 Item 1" },
        { id: 4, name: "Page 2 Item 2" },
      ],
      currentPage: 2,
      itemsPerPage: 2,
      totalItems: 6,
      totalPages: 3,
      hasPreviousPage: true,
      hasNextPage: true,
    };

    const mockDataSearch = {
      items: [{ id: 7, name: "Search Result 1" }],
      currentPage: 1,
      itemsPerPage: 2,
      totalItems: 1,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    };

    // Mock initial fetch response
    fetch.mockResponseOnce(JSON.stringify(mockDataPage1), { status: 200 });

    render(
      <DataProvider>
        <TestComponent />
      </DataProvider>
    );

    // 1. Perform initial fetch
    await act(async () => {
      screen.getByText("Fetch Initial").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("items-list")).toHaveTextContent(
        "Initial Item 1"
      );
      expect(screen.getByTestId("pagination-info")).toHaveTextContent(
        "Page: 1, Items per page: 2, Total items: 6, Total pages: 3, Has previous: false, Has next: true"
      );
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/items?page=1&limit=2&q=initial"
    );
    expect(fetch).toHaveBeenCalledTimes(1);

    // Mock response for the second page fetch
    fetch.mockResponseOnce(JSON.stringify(mockDataPage2), { status: 200 });

    // 2. Fetch second page
    await act(async () => {
      screen.getByText("Fetch Second Page").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("items-list")).toHaveTextContent(
        "Page 2 Item 1"
      );
      expect(screen.getByTestId("items-list")).not.toHaveTextContent(
        "Initial Item 1"
      ); // Ensure old items are gone
      expect(screen.getByTestId("pagination-info")).toHaveTextContent(
        "Page: 2, Items per page: 2, Total items: 6, Total pages: 3, Has previous: true, Has next: true"
      );
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/items?page=2&limit=2&q=second-page"
    );
    expect(fetch).toHaveBeenCalledTimes(2);

    // Mock response for the search term fetch
    fetch.mockResponseOnce(JSON.stringify(mockDataSearch), { status: 200 });

    // 3. Fetch with a search term
    await act(async () => {
      screen.getByText("Fetch Search Term").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("items-list")).toHaveTextContent(
        "Search Result 1"
      );
      expect(screen.getByTestId("items-list")).not.toHaveTextContent(
        "Page 2 Item 1"
      ); // Ensure old items are gone
      expect(screen.getByTestId("pagination-info")).toHaveTextContent(
        "Page: 1, Items per page: 2, Total items: 1, Total pages: 1, Has previous: false, Has next: false"
      );
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/items?page=1&limit=2&q=search-term"
    );
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("should throw an error if useData is not used within DataProvider", () => {
    // Mock console.error to prevent Jest from failing the test due to console errors
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Render TestComponent without DataProvider wrapper
    expect(() => render(<TestComponent />)).toThrow(
      "useData must be used within a DataProvider"
    );

    consoleErrorSpy.mockRestore(); // Restore original console.error
  });
});
