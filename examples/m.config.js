module.exports = {
  entry: "src/index.js",
  plugins: ["m-build-test"],
  output: "./dist",
  hooks: [
    [
      "start",
      function (context) {
        console.log("start");
      },
    ],
    [
      "configResolved",
      function () {
        console.log("configResolved");
      },
    ],
  ],
};
