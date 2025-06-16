const express = require('express');
const fs = require('fs');
const path = require('path');
const { readData } = require('../utils/readData');
const { writeData } = require('../utils/writeData');
const router = express.Router();



// GET /api/items

router.get("/", async (req, res, next) => {
  try {
    // Extract raw query parameters for page, limit, and search query.
    // We keep them raw initially to differentiate between undefined and invalid values.
    const { page: rawPage, limit: rawLimit, q } = req.query;

    let pageNum, limitNum;

    // --- Input Validation: Early exit for invalid page/limit parameters ---
    // Validate and parse 'page'. If present but invalid (not a positive number), throw an error.
    // Otherwise, default to 1.
    if (rawPage !== undefined) {
      pageNum = parseInt(rawPage, 10);
      if (isNaN(pageNum) || pageNum < 1) {
        const err = new Error(
          "Invalid page or limit parameters. Must be positive numbers."
        );
        err.status = 400; // Set HTTP status code for bad request
        throw err; // Fail fast before any expensive operations
      }
    } else {
      pageNum = 1; // Default to the first page if 'page' isn't provided
    }

    // Validate and parse 'limit'. Similar logic to 'page'.
    if (rawLimit !== undefined) {
      limitNum = parseInt(rawLimit, 10);
      if (isNaN(limitNum) || limitNum < 1) {
        const err = new Error(
          "Invalid page or limit parameters. Must be positive numbers."
        );
        err.status = 400;
        throw err; // Prevent processing with invalid limit
      }
    } else {
      limitNum = 2; // Default items per page if 'limit' isn't specified
    }

    // --- Data Retrieval & Filtering ---
    // Fetch all items asynchronously. This is a potentially I/O-bound operation.
    const allItems = await readData();
    let filteredItems = allItems; // Start with all items, then filter

    // Apply search filter if 'q' (query) parameter is present.
    // Performs a case-insensitive check on item names.
    if (q) {
      filteredItems = filteredItems.filter((item) =>
        item.name.toLowerCase().includes(q.toLowerCase())
      );
    }

    // --- Pagination Logic ---
    // Calculate total items after filtering and total available pages.
    const totalItems = filteredItems.length;
    let totalPages = Math.ceil(totalItems / limitNum);

    let paginatedItems; // This will hold the items for the current page

    // Handle pagination edge cases:
    // 1. If no items match the filter or the dataset is empty.
    if (totalItems === 0) {
      pageNum = 1; // Always reset to page 1 if no results
      totalPages = 0; // No pages if no items
      paginatedItems = []; // No items to display
    }
    // 2. If the requested page number is beyond the total available pages.
    // This allows the client to know they requested an out-of-bounds page,
    // while still providing an empty array as expected.
    else if (pageNum > totalPages) {
      paginatedItems = []; // Return an empty array for out-of-bounds pages
      // currentPage remains the requested (out-of-bounds) page number as per API contract/test.
    }
    // 3. Normal case: Page number is valid and within bounds.
    else {
      const startIndex = (pageNum - 1) * limitNum; // Calculate start index for slicing
      const endIndex = startIndex + limitNum; // Calculate end index for slicing
      paginatedItems = filteredItems.slice(startIndex, endIndex); // Slice the items for the current page
    }

    // --- Send Response ---
    // Construct and send the JSON response with paginated items and metadata.
    res.json({
      items: paginatedItems,
      currentPage: pageNum,
      itemsPerPage: limitNum,
      totalItems: totalItems,
      totalPages: totalPages,
      // Determine if there are previous/next pages for navigation controls.
      hasPreviousPage: pageNum > 1,
      hasNextPage: pageNum < totalPages,
    });
  } catch (err) {
    // Catch any errors that occurred during processing (e.g., file read errors, validation errors).
    // Pass them to the next middleware (usually an error handler).
    next(err);
  }
});









// GET /api/items/:id

router.get("/:id", async (req, res, next) => {
  try {
    // Fetch all items asynchronously. This ensures the operation doesn't block the server.
    const allItems = await readData();

    // Parse the item ID from the request parameters, ensuring it's an integer.
    // Use radix 10 for parseInt for predictable behavior.
    const itemId = parseInt(req.params.id, 10);

    // Find the item with the matching ID in the dataset.
    const item = allItems.find((i) => i.id === itemId);

    // If no item is found with the given ID, send a 404 Not Found error.
    if (!item) {
      const err = new Error("Item not found");
      err.status = 404; // Set the HTTP status to 404
      throw err; // Propagate the error to the Express error handling middleware
    }

    // If the item is found, send it as a JSON response.
    res.json(item);
  } catch (err) {
    // Catch any errors that occur during the process (e.g., file read errors, or the 404 error thrown above).
    // Pass the error to the next middleware for centralized error handling.
    next(err);
  }
});





// POST /api/items

router.post("/", async (req, res, next) => {
  try {
    // Extract the incoming item payload from the request body.
    const item = req.body;

    // --- Input Validation for the new item payload ---
    // Ensure 'name' is a non-empty string.
    if (
      !item.name ||
      typeof item.name !== "string" ||
      item.name.trim() === ""
    ) {
      const err = new Error(
        "Item name is required and must be a non-empty string."
      );
      err.status = 400; // Bad Request
      throw err; // Halt execution and pass error to middleware
    }

    // Ensure 'price' is a positive number.
    // Check for undefined, correct type, not NaN, and positive value.
    if (
      item.price === undefined ||
      typeof item.price !== "number" ||
      isNaN(item.price) ||
      item.price <= 0
    ) {
      const err = new Error(
        "Item price is required and must be a positive number."
      );
      err.status = 400; // Bad Request
      throw err; // Halt execution and pass error to middleware
    }

    // Ensure 'description' is a non-empty string.
    if (
      !item.description ||
      typeof item.description !== "string" ||
      item.description.trim() === ""
    ) {
      const err = new Error(
        "Item category is required and must be a non-empty string."
      );
      err.status = 400; // Bad Request
      throw err; // Halt execution and pass error to middleware
    }

    // --- Data Manipulation ---
    // Asynchronously read the current data from the storage.
    const data = await readData();

    // Assign a unique ID to the new item using the current timestamp.
    item.id = Date.now();

    // Add the validated and ID-assigned new item to the dataset.
    data.push(item);

    // Asynchronously write the updated data back to the storage.
    await writeData(data);

    // --- Send Response ---
    // Respond with a 201 Created status and the newly added item's details.
    res.status(201).json(item);
  } catch (err) {
    // Catch any errors that occurred during validation or data operations.
    // Pass the error to the Express error handling middleware for centralized processing.
    next(err);
  }
});

module.exports = router;