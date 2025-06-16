import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const DataContext = createContext();

export function DataProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paginationInfo, setPaginationInfo] = useState({
    currentPage: 1,
    itemsPerPage: 2,
    totalItems: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });

  // Use useCallback to memoize fetchItems to prevent infinite loops in useEffect
  // and to ensure it's stable when used as a dependency.
  const fetchItems = useCallback(async (page, limit, q) => {
    setLoading(true);
    setError(null);

    setTimeout(async () => {
      
      try {
        // Construct query string
        const params = new URLSearchParams();
        if (page) params.append("page", page);
        if (limit) params.append("limit", limit);
        if (q) params.append("q", q);
  
        const queryString = params.toString();
        const url = `http://localhost:3001/api/items${
          queryString ? `?${queryString}` : ""
        }`;
  
       
         
          const response = await fetch(url);
       
  
        if (!response.ok) {
          // Try to read error message from response
          const errorData = await response
            .json()
            .catch(() => ({ message: "Unknown error" }));
          throw new Error(
            errorData.message || `HTTP error! status: ${response.status}`
          );
        }
        const data = await response.json();
  
       
  
        setItems(data.items); // Update items state with the paginated data
        setPaginationInfo({
          // Update pagination metadata
          currentPage: data.currentPage,
          itemsPerPage: data.itemsPerPage,
          totalItems: data.totalItems,
          totalPages: data.totalPages,
          hasPreviousPage: data.hasPreviousPage,
          hasNextPage: data.hasNextPage,
        });
      } catch (err) {
        console.error("Failed to fetch items:", err);
        setError(err);
        setItems([]); // Clear items on error
        setPaginationInfo({
          // Reset pagination on error
          currentPage: 1,
          itemsPerPage: 2,
          totalItems: 0,
          totalPages: 0,
          hasPreviousPage: false,
          hasNextPage: false,
        });
      } finally {
        setLoading(false);
      }
    }, 500);
  }, []); // Empty dependency array means fetchItems is created once

  const value = {
    items,
    loading,
    error,
    paginationInfo,
    fetchItems,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
