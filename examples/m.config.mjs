export default {
  entry: "src/index.js",
  plugins: ["m-build-test"],
  hooks: [
    [
      "start",
      function (context) {
        console.log("start mjs");
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
