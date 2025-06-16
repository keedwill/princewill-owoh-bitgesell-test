const request = require("supertest");
const express = require("express");
const itemsRouter = require("../routes/items"); 
const fs = require("fs").promises; 
const { mockItems } = require("./mockData"); 

// --- Mock fs.promises for file operations ---
jest.mock("fs", () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(), // Include writeFile mock if other routes exist in items.js
  },
}));

// Declare mockedFsPromises to be assigned in beforeEach
let mockedFsPromises;

// Helper function to create a minimal Express app for testing
const createApp = () => {
  const app = express();
  app.use(express.json()); // Essential if other routes in items.js use req.body
  app.use("/api/items", itemsRouter); 

  // Generic error handling middleware for tests
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
  jest.clearAllMocks(); // Resets all mocks

  // CRITICAL: Get the mocked fs.promises here
  mockedFsPromises = require("fs").promises;

  // Set default mock implementation for readFile for this test file
  mockedFsPromises.readFile.mockResolvedValue(JSON.stringify(mockItems));
  // Set default mock implementation for writeFile (even if not used in this file's tests,
  // it prevents potential issues if itemsRouter's other methods were called).
  mockedFsPromises.writeFile.mockResolvedValue(undefined);
});

// --- Test Suite for GET /api/items/:id ---

describe("GET /api/items/:id", () => {

  test("should return a single item by ID if found", async () => {
    const res = await request(app).get("/api/items/1");
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(mockItems[0]); // Expect the first item from mockData
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1); // Should read the file once
  });

  test("should return another item by a different ID", async () => {
    const res = await request(app).get("/api/items/3");
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(mockItems[2]); // Expect the third item from mockData
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1); // Should read the file once
  });

  // ERROR CASES
  test('should return 404 and "Item not found" for a non-existent ID', async () => {
    const res = await request(app).get("/api/items/999"); // An ID not present in mockItems
    expect(res.statusCode).toEqual(404);
    expect(res.body.message).toEqual("Item not found");
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1); // Still reads file to check
  });

  test("should handle invalid ID format (non-numeric) and return 404", async () => {
    const res = await request(app).get("/api/items/abc"); // Invalid ID
    expect(res.statusCode).toEqual(404);
    expect(res.body.message).toEqual("Item not found"); // parseInt('abc') is NaN, find(i => i.id === NaN) will fail
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1);
  });

  test("should handle file read error gracefully for ID lookup", async () => {
    // Mock readFile to reject with an error
    mockedFsPromises.readFile.mockRejectedValueOnce(
      new Error("File read error during ID lookup")
    );

    const res = await request(app).get("/api/items/1");
    expect(res.statusCode).toEqual(500); // Expect 500 from error middleware
    expect(res.body.message).toEqual("File read error during ID lookup");
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1);
  });

  test("should handle invalid JSON data in file for ID lookup", async () => {
    // Mock readFile to return malformed JSON
    mockedFsPromises.readFile.mockResolvedValueOnce('{"invalid": json');

    const res = await request(app).get("/api/items/1");
    expect(res.statusCode).toEqual(500);
    expect(res.body.message).toMatch(/Unexpected|JSON/); // Expect JSON parsing error
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1);
  });

  test("should return empty array if data file does not exist (ENOENT) for ID lookup", async () => {
    // Mock readFile to reject with ENOENT error code
    const noEntError = new Error("No such file or directory");
    noEntError.code = "ENOENT";
    mockedFsPromises.readFile.mockRejectedValueOnce(noEntError);

    const res = await request(app).get("/api/items/1"); // Look for ID 1, but file doesn't exist
    expect(res.statusCode).toEqual(404); // readData returns [], so find will not find item -> 404
    expect(res.body.message).toEqual("Item not found");
    expect(mockedFsPromises.readFile).toHaveBeenCalledTimes(1);
  });
});
