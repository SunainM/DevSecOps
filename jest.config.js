module.exports = {
  testEnvironment: "node",
  reporters: [
    "default",
    [
      "jest-junit",
      { outputDirectory: "reports/junit", outputName: "jest-junit.xml" },
    ],
  ],
};
