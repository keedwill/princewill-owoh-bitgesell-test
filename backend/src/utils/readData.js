const path = require("path");

const fs = require("fs").promises;
const DATA_PATH = path.join(__dirname, '../../../data/items.json');

// Async utility to read data
async function readData() {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8"); // Use fs.readFile (async)
    return JSON.parse(raw);
  } catch (err) {
    // If the file doesn't exist return an empty array
    if (err.code === "ENOENT") {
      console.warn(
        `Data file not found at ${DATA_PATH}. Returning empty array.`
      );
      return [];
    }
    // Re-throw other errors
    throw err;
  }
}

module.exports = { readData };
