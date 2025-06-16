// babel.config.js
module.exports = {
  presets: [
    ["@babel/preset-env", { targets: { node: "current" } }], // Transpile for current Node.js version
    "@babel/preset-react", // Transpile JSX for React
  ],
};
