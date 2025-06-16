// src/setupTests.js
import "@testing-library/jest-dom"; // For jest-dom matchers

// If you are using jest-fetch-mock:
import fetchMock from "jest-fetch-mock";
fetchMock.enableMocks(); // This enables the mock for all tests that use this setup file
