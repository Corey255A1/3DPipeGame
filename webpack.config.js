const path = require("path");
const fs = require('fs');
const appDirectory = fs.realpathSync(process.cwd());

module.exports = {
    entry: path.resolve(appDirectory, "src/3DPipeGameMain.ts"), //path to the main .ts file
    output: {
        path:__dirname + '/public/',
        filename: 'js/3DPipeGameMain.js' //name for the javascript file that is created/compiled in memory
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"]
    },
    module: {
        rules: [
            {
              test: /\.tsx?$/,
              use: "ts-loader",
              exclude: /node_modules/
            },
        ]
    },
    mode: "development"
};