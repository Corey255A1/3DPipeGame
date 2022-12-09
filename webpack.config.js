const path = require('path');
module.exports = {
    entry: {
        PipeGame:'./src/3DPipeGameMain.ts'
    },
    output: {
        path: path.resolve(__dirname, 'public/scripts/'),
        filename: '[name].js',
        library: '[name]',
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    devtool: 'source-map',
    plugins: [

    ],
    devServer: {
        static:{
            directory: "./public"
        },
        hot: false
    },
    mode:'development',
    module: {
        rules: [{
            test: /\.tsx?$/,
            loader: 'ts-loader',
            exclude: /node_modules/
        }]
    }
}