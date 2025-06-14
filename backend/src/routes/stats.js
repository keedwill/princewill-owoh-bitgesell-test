const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { Worker } = require('worker_threads'); // Import Worker for offloading CPU tasks
const { readData } = require('../utils/readData');
const DATA_PATH = path.join(__dirname, '../../data/items.json');
const WORKER_PATH = path.join(__dirname, "../utils/worker.js");

// // GET /api/stats
// router.get('/', (req, res, next) => {
//   fs.readFile(DATA_PATH, (err, raw) => {
//     if (err) return next(err);

//     const items = JSON.parse(raw);
//     // Intentional heavy CPU calculation
//     const stats = {
//       total: items.length,
//       averagePrice: items.reduce((acc, cur) => acc + cur.price, 0) / items.length
//     };

//     res.json(stats);
//   });
// });



// GET /api/stats
router.get('/', async (req, res, next) => {
  try {
    // 1. Read data asynchronously (non-blocking I/O)
    const items = await readData(DATA_PATH);

    // 2. Offload the heavy CPU calculation to a worker thread
    const worker = new Worker(WORKER_PATH); // Create a new worker instance

    // Send the data needed for calculation to the worker
    worker.postMessage(items);

    // Listen for the 'message' event from the worker when it sends back results
    worker.on('message', (stats) => {
      res.json(stats); // Send the response to the client
      worker.terminate(); // Important: Terminate the worker thread to free resources
    });

    // Handle any errors that might occur within the worker thread
    worker.on('error', (err) => {
      console.error('Worker thread error:', err);
      worker.terminate(); // Ensure worker is terminated on error
      next(err); // Pass the error to Express's error handling middleware
    });

    // Handle the worker exiting (e.g., if it crashes or finishes)
    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
      }
    });

  } catch (err) {
    // Catch errors from readData() or any synchronous errors before worker creation
    next(err);
  }
});
module.exports = router;