import React, { useEffect, useState } from "react";
import { useData } from "../state/DataContext"; // Custom hook for accessing global data state and fetch logic
import { Link } from "react-router-dom"; // For navigation to individual item details
import { useMounted } from "../hooks/useMounted"; // Custom hook to track component mount status for async operations
import { FixedSizeList } from "react-window"; // Library for efficient list virtualization
import Spinner from "../components/spinner"; // UI component for loading indication
import Error from "../components/Error"; // UI component for error display and retry

// --- Row Component for FixedSizeList ---
// This component will be rendered for each item by react-window
// It receives 'index' (which item to render) and 'style' (for positioning) props.
// The 'style' prop MUST be applied to the outer element for virtualization to work.
const Row = ({ index, style, data }) => {
  const item = data.items[index];


  // item is undefined if the list is empty or index is out of bounds,
  // which might happen during initial load or empty search results.
  if (!item) return null;

  return (
    <div className="mb-6 hover:text-blue-500 ">
      {" "}
      <Link to={"/items/" + item.id}>{item.name}</Link>
    </div>
  );
};

function Items() {
  // Destructure state and actions from the global data context.
  const { items, loading, error, paginationInfo, fetchItems } = useData();

  // --- Virtualization Dimensions ---
  const listHeight = 400;
  const itemHeight = 35;
  const listWidth = "100%";

  // Local state for pagination and search
  const [currentPage, setCurrentPage] = useState(paginationInfo.currentPage);

  const [itemsPerPage, setItemsPerPage] = useState(2);
  // const [itemsPerPage, setItemsPerPage] = useState(paginationInfo.itemsPerPage);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  //  track if component is mounted to prevent state updates on unmounted component
  const isMounted = useMounted();

  // --- Effect for Debouncing Search Query ---
  // This useEffect hook implements a debounce mechanism for the search input.
  // It delays updating `debouncedSearchQuery` until the user pauses typing for 500ms.
  // This reduces the number of API calls, saving server resources and improving performance.
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery); // Update debounced query after delay
    }, 500); // 500ms debounce delay

    // Cleanup function: This runs if `searchQuery` changes before the timeout fires,
    // or if the component unmounts. It clears the pending timeout to prevent
    // setting state with an outdated `searchQuery` or on an unmounted component.
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]); // Effect re-runs only when `searchQuery` changes

  

  useEffect(() => {
  ;

    const fetchData = async () => {
      try {
        // Assuming fetchItems returns a promise that resolves when the data context is updated
        await fetchItems(currentPage, itemsPerPage, debouncedSearchQuery);
      } catch (error) {
        // if the component is still mounted to prevent memory leaks/warnings.
        if (isMounted()) {
          // Check if component is still mounted
          console.error("Error fetching items:", error);
        }
      }
    };

    fetchData();
  }, [fetchItems, isMounted, currentPage, itemsPerPage, debouncedSearchQuery]);

  // Handlers for pagination and search
  const handleNextPage = () => {
    if (paginationInfo.hasNextPage) {
      setCurrentPage((prevPage) => prevPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (paginationInfo.hasPreviousPage) {
      setCurrentPage((prevPage) => prevPage - 1);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Crucial: Reset to the first page when a new search is initiated.
    // This prevents showing an empty page if the user was on a high page number with previous results.
  };

  if (error) {
    return (
      <Error
        fetch={fetchItems}
        error={error}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        searchQuery={searchQuery}
      />
    );
  }

  return (
    <div className="px-[5%]  mt-4 overflow-x-hidden text-stone-100 antialiased h-[100%] flex flex-col justify-between ">
      <h1 className="  text-center  uppercase bg-gradient-to-r from-stone-300 to-stone-600 bg-clip-text text-3xl tracking-tight text-transparent">
        Items List
      </h1>

      {/* Background Grid and Radial Gradient (for visual flair) */}
      {/* These divs are purely for background styling and are positioned absolutely. */}
      <div className="fixed inset-0 -z-10">
        <div class="relative h-full w-full bg-black">
          <div class="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
          <div class="absolute left-0 right-0 top-[-10%] h-[1000px] w-[1000px] rounded-full bg-[radial-gradient(circle_400px_at_50%_300px,#fbfbfb36,#000)]"></div>
        </div>{" "}
      </div>

      {/* Search Input */}
      <div className="w-[100%] mt-4">
        <input
          aria-label="Search items by name"
          id="search-input"
          type="text"
          placeholder="Search items by name..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="pl-4 text-black flex items-center justify-center focus:outline-none border border-gray-300 p-2 rounded-md w-full placeholder:text-gray-400 placeholder:text-[14px] "
        />
      </div>

      <section
        id="items-list-container"
        aria-atomic="true"
        aria-live="polite"
        className="h-[400px] mt-4 w-[100%]"
      >
        {loading ? (
          // Show spinner when loading
          <div className="p-4">
            <Spinner />
          </div>
        ) : // Once not loading, check if there are items
        items.length === 0 ? (
          // No items found after loading
          <p>No items found.</p>
        ) : (
          // Items are available, render FixedSizeList
          <FixedSizeList
            className="mt-4"
            height={listHeight}
            width={listWidth}
            itemCount={items.length}
            itemSize={itemHeight}
            itemData={{ items: items }}
            children={Row}
          />
        )}
      </section>

      {/* Pagination Controls */}
      <nav
        aria-label="Pagination"
        className="text-[14px] flex gap-6 items-center justify-center mt-4 b-0"
      >
        <button
          className={`${
            !paginationInfo.hasPreviousPage
              ? "opacity-50 cursor-not-allowed"
              : ""
          } border border-gray-300 p-2 rounded-md`}
          onClick={handlePreviousPage}
          disabled={!paginationInfo.hasPreviousPage}
        >
          Previous
        </button>
        <span>
          Page {paginationInfo.currentPage} of {paginationInfo.totalPages} (
          {paginationInfo.totalItems} items)
        </span>
        <button
          className={`${
            !paginationInfo.hasNextPage ? "opacity-50 cursor-not-allowed" : ""
          } border border-gray-300 p-2 rounded-md`}
          onClick={handleNextPage}
          disabled={!paginationInfo.hasNextPage}
        >
          Next
        </button>
      </nav>
    </div>
  );
}

export default Items;
