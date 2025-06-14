

// --- Mock mockedFsPromises for file operations ---
jest.mock("fs", () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
  },
}));

const request = require("supertest");
const express = require("express");
const itemsRouter = require("../routes/items");

const fs = require("fs").promises; // Use promises for async/await
const path = require("path");
const { mockItems } = require("./mockData"); // Import mock data


// Now, declare a variable to hold the reference to the MOCKED mockedFsPromises
// We'll assign it in beforeEach
let mockedFsPromises;

// Helper function to create a minimal Express app for testing
const createApp = () => {
  const app = express();
  // Enable JSON body parsing for POST requests
  app.use(express.json());
  app.use("/api/items", itemsRouter);

  // error handling middleware for tests
  app.use((err, req, res, next) => {
    res
      .status(err.status || 500)
      .json({ message: err.message || "Internal Server Error" });
  });

  return app;
};

let app;

// Before each test, re-initialize the app and reset mocks
beforeEach(() => {
  app = createApp();
  // Reset mocks to clear previous calls before each test
  // This also clears any internal module-level caches in the route file
  jest.clearAllMocks(); // A convenient way to reset all mocks

  // CRITICAL FIX: Get the mocked mockedFsPromises here, after mocks are guaranteed to be set up
  // This imports the MOCKED 'fs' module.
  // We use require() again to ensure we get the mocked version provided by Jest.
  mockedFsPromises = require("fs").promises;

  // Now, set up the mock behavior on this explicitly retrieved mocked object
  mockedFsPromises.readFile.mockResolvedValue(JSON.stringify(mockItems));
  mockedFsPromises.writeFile.mockResolvedValue(undefined);
});

describe("GET /api/items", () => {
  // HAPPY PATHS
  test("should return all items when no query parameters are provided", async () => {
    const res = await request(app).get("/api/items");
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(mockItems);
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1); // Expect one file read
  });

  test('should return filtered items based on "q" query parameter (case-insensitive)', async () => {
    const res = await request(app).get("/api/items?q=mouse");
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual([{ id: 2, name: "Mouse", price: 25 }]);
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1); // Expect one file read
  });

  test('should return limited items based on "limit" query parameter', async () => {
    const res = await request(app).get("/api/items?limit=2");
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(mockItems.slice(0, 2));
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1); // Expect one file read
  });

  test("should return filtered and limited items", async () => {
    const res = await request(app).get("/api/items?q=o&limit=2");
    expect(res.statusCode).toEqual(200);
    // 'Laptop', 'Keyboard', 'Monitor' match 'o'. Limited to 2: 'Laptop', 'Keyboard'
    expect(res.body).toEqual([
      { id: 1, name: "Laptop", price: 1200 },
      { id: 2, name: "Mouse", price: 25 },
    ]);
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1); // Expect one file read
  });

  test("should return an empty array if no items match the query", async () => {
    const res = await request(app).get("/api/items?q=nonexistent");
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual([]);
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1); // Still reads, but filters to empty
  });

  test("should handle limit as a string number correctly", async () => {
    const res = await request(app).get("/api/items?limit=3");
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(mockItems.slice(0, 3));
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1);
  });

  test("should ignore invalid limit values (non-numeric strings) and return all items", async () => {
    // parseInt('abc', 10) results in NaN, slice(0, NaN) usually results in empty or unexpected.
    // The current slice(0, parseInt(limit, 10)) for NaN might return an empty array or all items depending on Node.js version.
    // Let's assume it results in an empty array as a strict interpretation of NaN slice.
    // However, common usage of slice with NaN yields no change. We should test actual behavior.
    const res = await request(app).get("/api/items?limit=abc");
    expect(res.statusCode).toEqual(200);
    // If parseInt('abc', 10) results in NaN, slice(0, NaN) returns original array
    expect(res.body).toEqual(mockItems); // As slice(0, NaN) means no change
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1);
  });

  // ERROR CASES
  test("should handle file read error gracefully", async () => {
    // Mock readFile to reject with an error
    mockedFsPromises.readFile.mockRejectedValueOnce(
      new Error("Failed to read items data")
    );

    const res = await request(app).get("/api/items");
    expect(res.statusCode).toEqual(500); // Expect 500 from error middleware
    expect(res.body.message).toEqual("Failed to read items data");
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1);
  });

  test("should handle invalid JSON data in file", async () => {
    // Mock readFile to return invalid JSON string
    mockedFsPromises.readFile.mockResolvedValueOnce('{"id":1, "name":"Test"'); // Incomplete JSON

    const res = await request(app).get("/api/items");
    expect(res.statusCode).toEqual(500); // Expect 500 from error middleware
    expect(res.body.message).toContain("JSON"); // Or other JSON parsing error
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1);
  });

  test("should return empty array if data file does not exist (ENOENT)", async () => {
    // Mock readFile to reject with ENOENT error code
    const noEntError = new Error("No such file or directory");
    noEntError.code = "ENOENT";
    mockedFsPromises.readFile.mockRejectedValueOnce(noEntError);

    const res = await request(app).get("/api/items");
    expect(res.statusCode).toEqual(200); // Your readData function handles ENOENT by returning []
    expect(res.body).toEqual([]);
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1);
  });
});
