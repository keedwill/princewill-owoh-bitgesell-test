import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter as Router } from "react-router-dom";
import { mock, mockClear } from "jest-mock-extended";
import Items from "../pages/Items";
import { useData } from "../state/DataContext";
import { useMounted } from "../hooks/useMounted";
import Spinner from "../components/spinner";
import Error from "../components/Error";

// Mock the DataContext and useMounted hook
// This allows us to control the values returned by these hooks in our tests.
jest.mock("../state/DataContext", () => ({
  useData: jest.fn(),
}));

jest.mock("../hooks/useMounted", () => ({
  useMounted: jest.fn(),
}));

// Mock the Spinner component
jest.mock("../components/spinner", () => {
  return jest.fn(() => <div data-testid="spinner">Loading...</div>);
});

// Mock the Error component:
// This mock now accurately reflects the structure of your actual Error component,
// including the static "Failed to load items!" text and handling the 'error' prop.
jest.mock("../components/Error", () => {
  return jest.fn(({ error }) => (
    <div data-testid="mocked-error-component">
      <p>Failed to load items!</p>{" "}
      {/* This matches the static text in your actual Error component */}
      {/* Explicitly render the message property of the error object if it exists,
          otherwise use the default fallback message. */}
      <p>
        {error && typeof error.message === "string"
          ? error.message
          : "An unexpected error occurred while fetching data."}
      </p>
      <button>Try Again</button> {/* Mock the button as well */}
    </div>
  ));
});

// Mock react-window's FixedSizeList.
// The 'Row' component passed as 'children' to FixedSizeList will be the actual 'Row'
// component defined within your 'Items.js' file.
jest.mock("react-window", () => ({
  FixedSizeList: jest.fn(({ itemData, children: Row }) => (
    <div data-testid="fixed-size-list">
      {/* Loop through all items and render them using the actual Row component */}
      {itemData.items.map((item, index) => (
        <Row key={item.id} index={index} style={{}} data={itemData} />
      ))}
    </div>
  )),
}));

describe("Items Component", () => {
  // Mock implementations for useData and useMounted
  let mockUseData;
  let mockUseMounted;

  // Reset mocks before each test
  beforeEach(() => {
    // Clear any previous mock calls and return values for all mocked dependencies
    mockClear(useData);
    mockClear(useMounted);
    mockClear(Spinner);
    mockClear(Error); // Clear mock for the Error component
    const { FixedSizeList } = jest.requireMock("react-window");
    mockClear(FixedSizeList);

    // Default mock implementations for useData and useMounted
    mockUseData = mock(); // Using jest-mock-extended for useData
    mockUseMounted = jest.fn(() => () => true); // Always mounted by default

    // Set the return values for the mocked hooks
    useData.mockReturnValue(mockUseData);
    useMounted.mockReturnValue(mockUseMounted);

    // Set default mock values for useData's properties
    mockUseData.items = [];
    mockUseData.loading = false;
    mockUseData.error = null;
    mockUseData.paginationInfo = {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    };
    // Mock fetchItems to resolve by default
    mockUseData.fetchItems = jest.fn().mockResolvedValue(undefined);
  });

  // Helper function to render the component within a Router
  // This is crucial because the actual Row component uses Link from react-router-dom.
  const renderComponent = () =>
    render(
      <Router>
        <Items />
      </Router>
    );

  test("should display a spinner when loading", () => {
    mockUseData.loading = true; // Simulate loading state
    renderComponent();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(Spinner).toHaveBeenCalledTimes(1); // Verify Spinner component was rendered
  });

  test("should display items after successful fetch and hide spinner", async () => {
    mockUseData.loading = false; // Simulate loading complete
    mockUseData.items = [
      { id: "1", name: "Item One" },
      { id: "2", name: "Item Two" },
    ];
    mockUseData.paginationInfo = {
      currentPage: 1,
      totalPages: 1,
      totalItems: 2,
      hasNextPage: false,
      hasPreviousPage: false,
    };

    renderComponent();

    // Wait for the useEffect to complete and fetchItems to be called
    await waitFor(() => {
      expect(mockUseData.fetchItems).toHaveBeenCalledWith(1, 2, "");
    });

    // Verify that the item names are displayed
    expect(screen.getByText("Item One")).toBeInTheDocument();
    expect(screen.getByText("Item Two")).toBeInTheDocument();
    // Verify that the spinner is no longer in the document
    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
  });

  test('should display "No items found." when items array is empty after loading', async () => {
    mockUseData.loading = false; // Simulate loading complete
    mockUseData.items = []; // Simulate no items returned
    mockUseData.paginationInfo = {
      currentPage: 1,
      totalPages: 0,
      totalItems: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    };

    renderComponent();

    // Wait for fetchItems to be called on mount
    await waitFor(() => {
      expect(mockUseData.fetchItems).toHaveBeenCalled();
    });

    expect(screen.getByText("No items found.")).toBeInTheDocument();
  });

  test("should render Error component when there is an error", () => {
    // Pass a new Error object as the error prop
    mockUseData.error = new Error("Failed to fetch items"); // Simulate an error state
    mockUseData.loading = false; // Ensure loading is false to hit the error rendering path

    renderComponent();

    // Log the entire DOM for debugging purposes if the test fails here
    console.log(screen.debug());

    expect(screen.getByTestId("mocked-error-component")).toBeInTheDocument(); // Use the new data-testid

    // Assert the presence of the static text from the Error component
    expect(screen.getByText("Failed to load items!")).toBeInTheDocument();

    

    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument(); // Spinner should not be present
  });

  test('should call fetchItems with updated page number on "Next" button click', async () => {
    mockUseData.loading = false;
    mockUseData.items = [{ id: "1", name: "Item One" }];
    mockUseData.paginationInfo = {
      currentPage: 1,
      totalPages: 2,
      totalItems: 10,
      hasNextPage: true, // Enable next button
      hasPreviousPage: false,
    };

    renderComponent();

    // Wait for the initial data fetch to complete
    await waitFor(() => {
      expect(mockUseData.fetchItems).toHaveBeenCalledWith(1, 2, "");
    });

    const nextButton = screen.getByRole("button", { name: /next/i });
    fireEvent.click(nextButton); // Simulate clicking the next button

    // Expect fetchItems to be called again with the next page number
    await waitFor(() => {
      expect(mockUseData.fetchItems).toHaveBeenCalledWith(2, 2, "");
    });
  });

  test('should call fetchItems with updated page number on "Previous" button click', async () => {
    mockUseData.loading = false;
    mockUseData.items = [{ id: "3", name: "Item Three" }];
    mockUseData.paginationInfo = {
      currentPage: 2,
      totalPages: 2,
      totalItems: 10,
      hasNextPage: false,
      hasPreviousPage: true, // Enable previous button
    };

    renderComponent();

    // Wait for the initial data fetch to complete
    await waitFor(() => {
      expect(mockUseData.fetchItems).toHaveBeenCalledWith(2, 2, "");
    });

    const previousButton = screen.getByRole("button", { name: /previous/i });
    fireEvent.click(previousButton); // Simulate clicking the previous button

    // Expect fetchItems to be called again with the previous page number
    await waitFor(() => {
      expect(mockUseData.fetchItems).toHaveBeenCalledWith(1, 2, "");
    });
  });

  test("Previous button should be disabled when hasPreviousPage is false", () => {
    mockUseData.paginationInfo.hasPreviousPage = false; // Disable previous page
    renderComponent();
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
  });

  test("Next button should be disabled when hasNextPage is false", () => {
    mockUseData.paginationInfo.hasNextPage = false; // Disable next page
    renderComponent();
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  test("should update search query and reset page on search input change", async () => {
    mockUseData.loading = false;
    mockUseData.items = [{ id: "1", name: "Item One" }];
    mockUseData.paginationInfo = {
      currentPage: 1,
      totalPages: 1,
      totalItems: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };

    renderComponent();

    // Wait for initial fetch
    await waitFor(() => {
      expect(mockUseData.fetchItems).toHaveBeenCalledWith(1, 2, "");
    });

    const searchInput = screen.getByPlaceholderText("Search items by name...");
    fireEvent.change(searchInput, { target: { value: "test query" } }); // Type into search input

    // Expect fetchItems to be called with the new search query and page reset to 1
    await waitFor(() => {
      expect(mockUseData.fetchItems).toHaveBeenCalledWith(1, 2, "test query");
    });

    // Verify the input field reflects the typed value
    expect(searchInput).toHaveValue("test query");
  });


});
