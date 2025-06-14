// worker.js
const { parentPort } = require("worker_threads");

// Listen for messages from the main thread (the Express route)
parentPort.on("message", (items) => {
  // Perform the heavy CPU calculation here
  // This runs in a separate thread, not blocking the main event loop
  const total = items.length;
  // Handle case where items might be empty to avoid division by zero
  const sumPrices = items.reduce((acc, cur) => acc + cur.price, 0);
  const averagePrice = total > 0 ? sumPrices / total : 0;

  const stats = {
    total: total,
    averagePrice: averagePrice,
  };

  // Send the calculated stats back to the main thread
  parentPort.postMessage(stats);
});
