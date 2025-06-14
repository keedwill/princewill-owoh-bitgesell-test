const path = require("path");

const fs = require("fs").promises;
const DATA_PATH = path.join(__dirname, '../../../data/items.json');

// Async utility to write data
async function writeData( data) {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), "utf8"); // Use fs.writeFile (async)
}

module.exports = { writeData };
