module.exports = {
  entry: {
    index: ["./src/index.js"],
  },
  output: {
    filename: "js/[name].js",
    path: "./dist",
  },
  plugins: [
    function (api) {
      const { chainWebpack } = api;
      const config = chainWebpack();
    },
  ],
  hooks: [
    [
      "start",
      function (context) {
        console.log("start");
      },
    ],
  ],
};
