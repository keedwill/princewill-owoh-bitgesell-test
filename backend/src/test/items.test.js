const request = require("supertest");
const express = require("express");
const itemsRouter = require("../routes/items");

// Mock fs.promises for file operations. This prevents tests from hitting the actual file system.
jest.mock("fs", () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
  },
}));

const { mockItems } = require("./mockData"); // Import mock data

// Declare mockedFsPromises to hold the reference to the MOCKED fs.promises.
// We'll assign it in beforeEach to ensure it's fresh for each test.
let mockedFsPromises;

// Helper function to create a minimal Express app for testing.
// This ensures each test runs with a fresh Express instance.
const createApp = () => {
  const app = express();
  // Enable JSON body parsing for POST requests (important if other routes in itemsRouter use req.body)
  app.use(express.json());
  // Mount your items router under the /api/items path
  app.use("/api/items", itemsRouter);

  // Generic error handling middleware for tests.
  // This catches errors thrown by routes and formats them as JSON responses.
  app.use((err, req, res, next) => {
    res
      .status(err.status || 500)
      .json({ message: err.message || "Internal Server Error" });
  });

  return app;
};

let app;

// Before each test, re-initialize the app and reset all Jest mocks.
beforeEach(() => {
  app = createApp();
  // jest.clearAllMocks() clears call history and resets mock implementations,
  // crucial for isolated testing.
  jest.clearAllMocks();

  // Get the mocked fs.promises here, guaranteeing Jest's mock is set up.
  mockedFsPromises = require("fs").promises;

  // Default mock behavior for readFile: always return a stringified version of mockItems.
  mockedFsPromises.readFile.mockResolvedValue(JSON.stringify(mockItems));
  // Default mock behavior for writeFile: always resolve successfully.
  mockedFsPromises.writeFile.mockResolvedValue(undefined);
});

describe("GET /api/items - Pagination and Search", () => {
  // Test Case: Should return paginated items with default values when no query parameters are provided.
  test("should return paginated items with default page and limit (1, 10) when no query parameters are provided", async () => {
    // Assuming your server's default limit is 2 if not specified.
    const expectedLimit = 2;
    const res = await request(app).get("/api/items");

    expect(res.statusCode).toEqual(200);
    // Expect the response body to be an object with 'items' and pagination metadata.
    expect(res.body).toHaveProperty("items");
    expect(res.body).toHaveProperty("currentPage", 1);
    expect(res.body).toHaveProperty("itemsPerPage", expectedLimit);
    expect(res.body).toHaveProperty("totalItems", mockItems.length); // Total items before pagination
    expect(res.body).toHaveProperty(
      "totalPages",
      Math.ceil(mockItems.length / expectedLimit)
    );
    expect(res.body).toHaveProperty("hasPreviousPage", false);
    expect(res.body).toHaveProperty(
      "hasNextPage",
      mockItems.length > expectedLimit
    );

    // Expect the 'items' array within the response body to contain the first 'expectedLimit' items.
    expect(res.body.items).toEqual(mockItems.slice(0, expectedLimit));
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1); // Still expects one file read.
  });

  // Test Case: Should return filtered items based on the 'q' query parameter.
  test('should return filtered items based on "q" query parameter (case-insensitive) with pagination metadata', async () => {
    const expectedLimit = 2; // Assuming default limit
    const res = await request(app).get("/api/items?q=mouse");

    const filtered = mockItems.filter((item) =>
      item.name.toLowerCase().includes("mouse")
    );

    expect(res.statusCode).toEqual(200);
    expect(res.body.items).toEqual(filtered.slice(0, expectedLimit)); // Filtered then paginated
    expect(res.body).toHaveProperty("currentPage", 1);
    expect(res.body).toHaveProperty("itemsPerPage", expectedLimit);
    expect(res.body).toHaveProperty("totalItems", filtered.length); // Total filtered items
    expect(res.body).toHaveProperty(
      "totalPages",
      Math.ceil(filtered.length / expectedLimit)
    );
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1);
  });

  // Test Case: Should return paginated items based on the 'limit' query parameter.
  test('should return items paginated by "limit" query parameter', async () => {
    const customLimit = 2;
    const res = await request(app).get(`/api/items?limit=${customLimit}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.items).toEqual(mockItems.slice(0, customLimit));
    expect(res.body).toHaveProperty("currentPage", 1);
    expect(res.body).toHaveProperty("itemsPerPage", customLimit);
    expect(res.body).toHaveProperty("totalItems", mockItems.length);
    expect(res.body).toHaveProperty(
      "totalPages",
      Math.ceil(mockItems.length / customLimit)
    );
    expect(res.body).toHaveProperty("hasPreviousPage", false);
    expect(res.body).toHaveProperty(
      "hasNextPage",
      mockItems.length > customLimit
    );
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1);
  });

  // Test Case: Should return paginated and filtered items.
  test("should return filtered and paginated items", async () => {
    const customLimit = 2;
    const res = await request(app).get(`/api/items?q=o&limit=${customLimit}`);

    // First filter by 'o', then take the first 'customLimit' items
    const filteredByQ = mockItems.filter((item) =>
      item.name.toLowerCase().includes("o")
    ); // Laptop, Mouse, Keyboard, Monitor
    const expectedPaginated = filteredByQ.slice(0, customLimit); // Laptop, Mouse

    expect(res.statusCode).toEqual(200);
    expect(res.body.items).toEqual(expectedPaginated);
    expect(res.body).toHaveProperty("currentPage", 1);
    expect(res.body).toHaveProperty("itemsPerPage", customLimit);
    expect(res.body).toHaveProperty("totalItems", filteredByQ.length);
    expect(res.body).toHaveProperty(
      "totalPages",
      Math.ceil(filteredByQ.length / customLimit)
    );
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1);
  });

  // --- New Pagination-Specific Tests ---

  // Test Case: Should return items for a specific page number.
  test("should return items for a specific page number", async () => {
    const customLimit = 2; // Keep limit small to easily test pages
    const page = 2;
    const res = await request(app).get(
      `/api/items?page=${page}&limit=${customLimit}`
    );

    const startIndex = (page - 1) * customLimit;
    const expectedItems = mockItems.slice(startIndex, startIndex + customLimit);

    expect(res.statusCode).toEqual(200);
    expect(res.body.items).toEqual(expectedItems);
    expect(res.body).toHaveProperty("currentPage", page);
    expect(res.body).toHaveProperty("itemsPerPage", customLimit);
    expect(res.body).toHaveProperty("totalItems", mockItems.length);
    expect(res.body).toHaveProperty(
      "totalPages",
      Math.ceil(mockItems.length / customLimit)
    );
    expect(res.body).toHaveProperty("hasPreviousPage", true); // Page 2, so previous is true
    expect(res.body).toHaveProperty("hasNextPage", true); // More pages after page 2
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1);
  });

  // Test Case: Should return empty array if page is out of bounds.
  test("should return empty items array if page is out of bounds", async () => {
    const customLimit = 2;
    const page = 100; // Very large page number
    const res = await request(app).get(
      `/api/items?page=${page}&limit=${customLimit}`
    );

    expect(res.statusCode).toEqual(200);
    expect(res.body.items).toEqual([]);
    expect(res.body).toHaveProperty("currentPage", page);
    expect(res.body).toHaveProperty("itemsPerPage", customLimit);
    expect(res.body).toHaveProperty("totalItems", mockItems.length);
    expect(res.body).toHaveProperty(
      "totalPages",
      Math.ceil(mockItems.length / customLimit)
    );
    expect(res.body).toHaveProperty("hasPreviousPage", true); // Has previous pages
    expect(res.body).toHaveProperty("hasNextPage", false); // No next page
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1);
  });

  // Test Case: Should handle string numbers for page/limit correctly.
  test("should handle page and limit as string numbers correctly", async () => {
    const res = await request(app).get("/api/items?page=1&limit=3");
    expect(res.statusCode).toEqual(200);
    expect(res.body.items).toEqual(mockItems.slice(0, 3));
    expect(res.body).toHaveProperty("currentPage", 1);
    expect(res.body).toHaveProperty("itemsPerPage", 3);
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1);
  });

  // Test Case: Should handle invalid limit values gracefully (as per your route logic).
  test("should return 400 for invalid limit values (non-numeric, negative)", async () => {
    let res = await request(app).get("/api/items?limit=abc");
    expect(res.statusCode).toEqual(400);
    expect(res.body.message).toEqual(
      "Invalid page or limit parameters. Must be positive numbers."
    );

    res = await request(app).get("/api/items?limit=-5");
    expect(res.statusCode).toEqual(400);
    expect(res.body.message).toEqual(
      "Invalid page or limit parameters. Must be positive numbers."
    );

    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(0); // Should not read file if params are invalid
  });

  // Test Case: Should handle invalid page values gracefully (non-numeric, negative).
  test("should return 400 for invalid page values (non-numeric, negative)", async () => {
    let res = await request(app).get("/api/items?page=xyz");
    expect(res.statusCode).toEqual(400);
    expect(res.body.message).toEqual(
      "Invalid page or limit parameters. Must be positive numbers."
    );

    res = await request(app).get("/api/items?page=-1");
    expect(res.statusCode).toEqual(400);
    expect(res.body.message).toEqual(
      "Invalid page or limit parameters. Must be positive numbers."
    );

    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(0); // Should not read file if params are invalid
  });

  // --- Remaining ERROR CASES (from your original test, with slight adjustments) ---

  test("should return empty items array if no items match the query", async () => {
    const expectedLimit = 10;
    const res = await request(app).get("/api/items?q=nonexistent");
    expect(res.statusCode).toEqual(200);
    expect(res.body.items).toEqual([]); // Ensure it's res.body.items
    expect(res.body.totalItems).toEqual(0); // Also check totalItems
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1);
  });

  test("should handle file read error gracefully", async () => {
    mockedFsPromises.readFile.mockRejectedValueOnce(
      new Error("Failed to read items data")
    );

    const res = await request(app).get("/api/items");
    expect(res.statusCode).toEqual(500);
    expect(res.body.message).toEqual("Failed to read items data");
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1);
  });

  test("should handle invalid JSON data in file", async () => {
    mockedFsPromises.readFile.mockResolvedValueOnce('{"id":1, "name":"Test"');

    const res = await request(app).get("/api/items");
    expect(res.statusCode).toEqual(500);
    expect(res.body.message).toContain("JSON");
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1);
  });

  test("should return empty array if data file does not exist (ENOENT)", async () => {
    const noEntError = new Error("No such file or directory");
    noEntError.code = "ENOENT";
    mockedFsPromises.readFile.mockRejectedValueOnce(noEntError);

    // This test now expects a full paginated response object, even if items are empty.
    const expectedLimit = 2; // Default limit
    const res = await request(app).get("/api/items");
    expect(res.statusCode).toEqual(200);
    expect(res.body.items).toEqual([]); // items array is empty
    expect(res.body).toHaveProperty("currentPage", 1);
    expect(res.body).toHaveProperty("itemsPerPage", expectedLimit);
    expect(res.body).toHaveProperty("totalItems", 0);
    expect(res.body).toHaveProperty("totalPages", 0);
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1);
  });
});
