const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { Worker } = require('worker_threads'); // Import Worker for offloading CPU tasks
const { readData } = require('../utils/readData');
const DATA_PATH = path.join(__dirname, '../../data/items.json');
const WORKER_PATH = path.join(__dirname, "../utils/worker.js");


// GET /api/stats
router.get("/", async (req, res, next) => {
  try {
    //  Read data asynchronously:
    // This performs non-blocking I/O, ensuring the main thread remains responsive.
    const items = await readData(DATA_PATH);

    //  Offload CPU-bound calculation to a worker thread:
    // Creating a new Worker instance allows computationally intensive tasks
    // to run on a separate thread, preventing the Node.js event loop from blocking
    // and maintaining responsiveness for other incoming requests.
    const worker = new Worker(WORKER_PATH);

    // Send the data required for the heavy calculation to the worker thread.
    // This message initiates the processing within the worker.
    worker.postMessage(items);

    // Set up event listeners for the worker thread:

    // 'message' event: Fired when the worker sends results back to the main thread.
    worker.on("message", (stats) => {
      res.json(stats); // Send the calculated statistics as the API response.
      worker.terminate(); // Crucial: Terminate the worker to free up system resources immediately after use.
    });

    // 'error' event: Fired if any uncaught error occurs within the worker thread.
    worker.on("error", (err) => {
      console.error("Worker thread error:", err);
      worker.terminate(); // Ensure the worker is terminated even on error to prevent resource leaks.
      next(err); // Pass the error to Express's centralized error handling middleware.
    });

    // 'exit' event: Fired when the worker thread exits.
    // This is useful for debugging if the worker terminates unexpectedly.
    worker.on("exit", (code) => {
      if (code !== 0) {
        // A non-zero exit code indicates an abnormal termination.
        console.error(`Worker stopped with exit code ${code}`);
      }
      // No 'next(err)' here, as the 'error' event already handles error propagation.
    });
  } catch (err) {
    // Catch any errors that occur before the worker thread is fully initialized,
    // such as issues during `readData()` or synchronous errors.
    next(err); // Pass the error to the Express error handling middleware.
  }
});
module.exports = router;