# Client-Side Consumption of Paginated & Searchable API

This document outlines the best practices and considerations for building a client-side application that effectively consumes the paginated and searchable /api/items endpoint.

## Approach
The primary approach is to manage the page, limit, and q (search query) parameters as client-side state. Changes to this state trigger new API requests, and the UI dynamically updates based on the API response. 


Key Implementation Details:
    1.) Centralized State Management for Query Parameters:
        - Maintain state variables for currentPage, itemsPerPage (corresponding to limit), and searchQuery (corresponding to q).
    2.) Asynchronous Data Fetching:
        - Used a dedicated fetching function that triggers whenever currentPage, itemsPerPage, or searchQuery changes.
    3.) Dynamic Pagination Controls:
        - "Next" and "Previous" Buttons
        - Page Number Buttons
        - Search Input Handling
            - Implemented a debounce mechanism (e.g., using setTimeout) to delay updating searchQuery state and triggering API calls until the user pauses typing. This prevents excessive requests.

Benefits:
    - Responsiveness
    - Clear loading states, error messages, and intuitive pagination controls enhance usability.
    - Debouncing search prevents unnecessary server load.
    - Centralizing state and using modular components keeps the code organized.
    - Scalability

Trade-offs:
    - Consistency with Backend: Client-side defaults for itemsPerPage and expected out-of-bounds currentPage behavior (e.g., always 1 vs. requested page number) must align with the backend API's implementation.