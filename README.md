API for Paginated & Searchable Items

This project provides a simple, robust Node.js Express API for serving a list of items. It supports efficient pagination and case-insensitive full-text search, with data stored in a local JSON file.
_____________________________________________________________________________________________________________________________

🚀 Features
   -Retrieve Items: Fetch a list of all available items.
   -Pagination: Control the number of items per page and navigate through different pages.
   -Search: Filter items based on a case-insensitive search query (q parameter).
   -Robust Error Handling: Clear error responses for invalid input parameters and server-side issues (e.g., data file not found).
   -Non-Blocking Operations: Utilizes asynchronous file I/O to ensure the server remains responsive.

_____________________________________________________________________________________________________________________________

🛠️ Technologies Used
   -Node.js: JavaScript runtime environment.
   -Express.js: Fast, unopinionated, minimalist web framework for Node.js.
   -Jest: JavaScript testing framework.
   -Supertest: A super-agent driven library for testing Node.js HTTP servers.
   -fs.promises: Node.js's native asynchronous file system API (for non-blocking I/O).

_____________________________________________________________________________________________________________________________

⚡ Getting Started
These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

Prerequisites
Make sure you have Node.js installed.

Installation
   1.) Clone the repository:
         git clone https://github.com/keedwill/princewill-owoh-bitgesell-test
         cd backend / frontend

   2.) Install NPM packages:
         npm install
   
   3.) Run the server:
         npm start
         The server will start on http://localhost:3001 (or your configured port).
   
_____________________________________________________________________________________________________________________________

🎯 API Endpoints
The core functionality is exposed via a single GET endpoint.

GET /api/items
Retrieves a paginated and searchable list of items.

Query Parameters:
   1.) page (Optional): Integer. The current page number. Defaults to 1. Must be a positive number.
   2.) limit (Optional): Integer. The maximum number of items per page. Defaults to 2. Must be a positive number.
   3.) q (Optional): String. A case-insensitive search query to filter items by their name.

Responses:
   200 OK: Successfully returns a paginated list of items and pagination metadata.

   {
  "items": [
    { "id": 1, "name": "Laptop", "price": 1200 },
    { "id": 2, "name": "Mouse", "price": 25 }
  ],
  "currentPage": 1,
  "itemsPerPage": 2,
  "totalItems": 6,
  "totalPages": 3,
  "hasPreviousPage": false,
  "hasNextPage": true
   }

   400 Bad Request: Returned if page or limit parameters are invalid (e.g., non-numeric, negative, or zero).

   {
  "message": "Invalid page or limit parameters. Must be positive numbers."
   }

   500 Internal Server Error: Returned for unexpected server errors, such as the data file not being found or read errors.

   {
  "message": "Internal Server Error"
   }


   Examples:
   Get first page (default limit): GET /api/items
   Get second page, 5 items per page: GET /api/items?page=2&limit=5
   Search for "mouse" (case-insensitive): GET /api/items?q=mouse
   Search and paginate: GET /api/items?page=1&limit=3&q=laptop

_____________________________________________________________________________________________________________________________

🧪 Testing
To run the automated tests for the API:

npm test

_____________________________________________________________________________________________________________________________


⚙️ Design Choices & Approach

This API was designed with non-blocking asynchronous operations and robust input validation as core principles.

   1.) Asynchronous File I/O: The readData utility function utilizes fs.promises.readFile with async/await. This ensures that file reading is non-blocking, preventing the Node.js event loop from being tied up during I/O operations and keeping the server responsive under load.

   2.) Early Parameter Validation: Incoming page and limit query parameters are parsed and validated at the very beginning of the request. If any are invalid (e.g., non-numeric, negative), a 400 Bad Request response is sent immediately, preventing unnecessary data file reads or processing. This conserves server resources and improves security.

   3.) Comprehensive Pagination Logic: The API handles various pagination scenarios, including:
         - Applying default page and limit values.
         - Accurately calculating totalItems and totalPages after applying search filters.
         - Gracefully handling requests for pages that are out of bounds (beyond totalPages) by returning an empty items array while   still reflecting the currentPage requested by the client.

   4.) Centralized Error Handling: Errors are propagated via next(err) to an Express error-handling middleware, ensuring consistent and informative error responses.


_____________________________________________________________________________________________________________________________

🖥️ Client-Side Consumption

The API is designed to be consumed by any client-side application (e.g., built with React, Vue, Angular, or plain JavaScript). The client-side implementation involves:

   - Maintaining the current page, limit, and search query as component state.
   - Using fetch or axios to make API calls whenever these state variables change.
   - Implementing debouncing for the search input to avoid excessive API requests while the user types.
   - Dynamically rendering lists, pagination controls, and status messages (loading, error, no results) based on the API's JSON responses.


## Quick Start

node version: 20.XX
```bash
nvm install 20
nvm use 20

# Terminal 1
cd backend
npm install
npm start

# Terminal 2
cd frontend
npm install
npm start
```

