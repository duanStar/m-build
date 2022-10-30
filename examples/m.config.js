module.exports = {
  entry: "src/index.js",
  plugins: ["m-build-test"],
  output: "./dist",
  plugins: ["m-build-test", function () {}, ["m-build-test", { a: 1 }]],
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
