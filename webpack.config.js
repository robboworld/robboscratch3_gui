const defaultsDeep = require('lodash.defaultsdeep');
const fs = require('fs');
var path = require('path');
var webpack = require('webpack');

// Plugins
var CopyWebpackPlugin = require('copy-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var UglifyJsPlugin = require('uglifyjs-webpack-plugin');

// PostCss
var autoprefixer = require('autoprefixer');
var postcssVars = require('postcss-simple-vars');
var postcssImport = require('postcss-import');

// `npm run build:release` is the release build on every OS. The npm script cannot carry a
// bash-style NODE_ENV=production (build.ps1 runs it on Windows), and without NODE_ENV it used
// to produce an unminified development bundle (~30 MB lib.min.js instead of ~16 MB).
if (process.env.npm_lifecycle_event === 'build:release' && !process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
}

const isProduction = process.env.NODE_ENV === 'production' || process.env.BUILD_MODE === 'dist';
const shouldBuildLibraryDist = process.env.BUILD_MODE === 'dist';
const isAppBuild = process.env.BUILD_MODE === 'app';

const webSeo = {
    enabled: true,
    description: 'Robbo Scratch — онлайн-среда визуального программирования на Scratch для детей и школ. Создавайте анимации и 2D-игры и программируйте роботов РОББО в браузере.',
    canonical: 'https://scratch.ru/',
    siteUrl: 'https://scratch.ru',
    siteName: 'Robbo Scratch',
    locale: 'ru_RU',
    ogImage: 'https://scratch.ru/static/favicon.png',
    organizationName: 'ROBBO',
    organizationUrl: 'https://robboclub.ru'
};

// Blocks of components/loader inlined into index.html: the static loading screen shows them
// before any script has loaded (see src/lib/loading-splash.js).
const loaderBlockDataUri = name => 'data:image/svg+xml;base64,' +
    fs.readFileSync(path.resolve(__dirname, 'src/components/loader', name)).toString('base64');
// The Loader headline in every editor locale, so the static screen shows the same title as the
// React Loader that replaces it. Read from scratch-l10n: supported locales and their messages.
const loaderHeadlines = (() => {
    const l10nDir = path.resolve(__dirname, 'node_modules/scratch-l10n');
    const readHeadline = locale => {
        try {
            const file = path.join(l10nDir, 'editor/interface', `${locale}.json`);
            return JSON.parse(fs.readFileSync(file, 'utf8'))['gui.loader.headline'];
        } catch (e) {
            return null;
        }
    };
    const fallback = readHeadline('en') || 'Loading Project';
    let locales = [];
    try {
        const source = fs.readFileSync(path.join(l10nDir, 'src/supported-locales.js'), 'utf8');
        locales = Array.from(source.matchAll(/^\s*'([^']+)': \{name:/gm), match => match[1]);
    } catch (e) {
        // No titles: the static screen shows the blocks only.
    }
    return locales.reduce((acc, locale) => Object.assign(acc, {[locale]: readHeadline(locale) || fallback}), {});
})();
const loadingSplash = {
    top: loaderBlockDataUri('top-block.svg'),
    middle: loaderBlockDataUri('middle-block.svg'),
    bottom: loaderBlockDataUri('bottom-block.svg'),
    // Inlined into a <script>: no "</" may close it early.
    headlinesJson: JSON.stringify(loaderHeadlines).replace(/</g, '\\u003c')
};

const useBabelCache = !isProduction;

const babelLoaderOptions = {
    babelrc: false,
    plugins: [
        '@babel/plugin-syntax-dynamic-import',
        '@babel/plugin-transform-async-to-generator',
        '@babel/plugin-proposal-object-rest-spread',
        ['react-intl', {
            messagesDir: './translations/messages/'
        }]
    ],
    presets: [
        ['@babel/preset-env', {useBuiltIns: 'entry'}],
        '@babel/preset-react'
    ]
};

const babelRule = {
    test: /\.jsx?$/,
    include: [path.resolve(__dirname, 'src'), /node_modules[\\/]scratch-[^\\/]+[\\/]src/],
    use: useBabelCache ? [
        {
            loader: 'cache-loader',
            options: {
                cacheDirectory: path.resolve(__dirname, 'node_modules/.cache/babel-loader')
            }
        },
        {
            loader: 'babel-loader',
            options: babelLoaderOptions
        }
    ] : {
        loader: 'babel-loader',
        options: babelLoaderOptions
    }
};

const base = {
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? false : 'cheap-module-source-map',
    devServer: {
        contentBase: path.resolve(__dirname, 'build'),
        // Prefer localhost (not 127.0.0.1): refresh_token cookies are host-bound and
        // ЛК opens the editor via SCRATCH_EDITOR_URL=http://localhost:8601/.
        host: 'localhost',
        disableHostCheck: true,
        port: process.env.PORT || 8601,
        headers: {
            'Permissions-Policy': 'unload=(self)'
        }
    },
    output: {
        library: 'GUI',
        filename: '[name].js'
    },
    externals: {
        React: 'react',
        ReactDOM: 'react-dom'
    },
    resolve: {
        symlinks: false,
        alias: {
            'scratch-render$': 'scratch-render/dist/web/scratch-render.js',
            'scratch-vm$': 'scratch-vm/dist/web/scratch-vm.js',
            'scratch-audio$': 'scratch-audio/dist.js'
        }
    },
    node: {
        fs: 'empty',
        path: 'empty',
        os: 'empty',
        crypto: 'empty',
        stream: 'empty',
        net: 'empty',
        tls: 'empty'
    },
    target: 'web', // Явно указываем веб-таргет
    module: {
        rules: [babelRule,
        {
            test: /\.css$/,
            use: [{
                loader: 'style-loader'
            }, {
                loader: 'css-loader',
                options: {
                    modules: true,
                    importLoaders: 1,
                    localIdentName: '[name]_[local]_[hash:base64:5]',
                    camelCase: true
                }
            }, {
                loader: 'postcss-loader',
                options: {
                    ident: 'postcss',
                    plugins: function () {
                        return [
                            postcssImport,
                            postcssVars,
                	    autoprefixer()
                        ];
                    }
                }
            }]
        }]
    },
    optimization: {
        minimizer: [
            new UglifyJsPlugin({
                include: /\.min\.js$/
            })
        ]
    },
    plugins: []
};

module.exports = [
    // to run editor examples
    defaultsDeep({}, base, {
        entry: isAppBuild ? {
            'lib.min': ['react', 'react-dom'],
            'gui': './src/playground/index.jsx'
        } : {
            'lib.min': ['react', 'react-dom'],
            'gui': './src/playground/index.jsx',
            'blocksonly': './src/playground/blocks-only.jsx',
            'compatibilitytesting': './src/playground/compatibility-testing.jsx',
            'player': './src/playground/player.jsx'
        },
        output: {
            path: path.resolve(__dirname, 'build'),
            filename: '[name].js'
        },
        externals: {
            React: 'react',
            ReactDOM: 'react-dom'
        },
        module: {
            rules: base.module.rules.concat([
                {
                    test: /\.(svg|png|wav|gif|jpg)$/,
                    loader: 'file-loader',
                    options: {
                        outputPath: 'static/assets/'
                    }
                }
            ])
        },
        optimization: {
            splitChunks: {
                chunks: 'all',
                name: 'lib.min'
            },
            runtimeChunk: {
                name: 'lib.min'
            }
        },
        plugins: base.plugins.concat(
            [
                new webpack.DefinePlugin({
                    'process.env.NODE_ENV': '"' + (process.env.NODE_ENV || 'development') + '"',
                    'process.env.DEBUG': Boolean(process.env.DEBUG),
                    'process.env.GA_ID': '"' + (process.env.GA_ID || 'UA-000000-01') + '"',
                    'process.env.ROBBO_BUILD_VERSION_SUFFIX': '"-web"',
                    'process.env.RS3_ACTIVATION_BASE_URL': JSON.stringify(process.env.RS3_ACTIVATION_BASE_URL || ''),
                    'process.env.ROBBO_ACCOUNT_API_URL': JSON.stringify(process.env.ROBBO_ACCOUNT_API_URL || ''),
                    'process.env.ROBBO_ACCOUNT_LK_URL': JSON.stringify(process.env.ROBBO_ACCOUNT_LK_URL || ''),
                    'process.env.ROBBO_LMS_URL': JSON.stringify(process.env.ROBBO_LMS_URL || '')
                }),
                new HtmlWebpackPlugin({
                    chunks: ['lib.min', 'gui'],
                    template: 'src/playground/index.ejs',
                    title: 'Robbo Scratch | Роббо скретч — скретч онлайн для детей и школ, российская платформа для программирования',
                    favicon: path.resolve(__dirname, 'static/favicon.png'),
                    sentryConfig: process.env.SENTRY_CONFIG ? '"' + process.env.SENTRY_CONFIG + '"' : null,
                    seo: webSeo,
                    loadingSplash,
                    yandexMetrika: isProduction ? 93772324 : null
                })
            ],
            isAppBuild ? [] : [
                new HtmlWebpackPlugin({
                    chunks: ['lib.min', 'blocksonly'],
                    template: 'src/playground/index.ejs',
                    filename: 'blocks-only.html',
                    title: 'Scratch 3.0 GUI: Blocks Only Example'
                }),
                new HtmlWebpackPlugin({
                    chunks: ['lib.min', 'compatibilitytesting'],
                    template: 'src/playground/index.ejs',
                    filename: 'compatibility-testing.html',
                    title: 'Scratch 3.0 GUI: Compatibility Testing'
                }),
                new HtmlWebpackPlugin({
                    chunks: ['lib.min', 'player'],
                    template: 'src/playground/index.ejs',
                    filename: 'player.html',
                    title: 'Scratch 3.0 GUI: Player Example'
                })
            ],
            [
                new CopyWebpackPlugin([{
                    from: 'static/seo/robots.txt',
                    to: 'robots.txt'
                }]),
                new CopyWebpackPlugin([{
                    from: 'static/seo/sitemap.xml',
                    to: 'sitemap.xml'
                }]),
                new CopyWebpackPlugin([{
                    from: 'static',
                    to: 'static'
                }]),
                new CopyWebpackPlugin([{
                    from: 'node_modules/scratch-blocks/media',
                    to: 'static/blocks-media'
                }]),
                new CopyWebpackPlugin([{
                    from: 'extensions/**',
                    to: 'static',
                    context: 'src/examples'
                }]),
                new CopyWebpackPlugin([{
                    from: isProduction ? 'extension-worker.js' : 'extension-worker.{js,js.map}',
                    context: 'node_modules/scratch-vm/dist/web'
                }])
            ]
        )
    })
].concat(
    shouldBuildLibraryDist ? (
        // export as library
        defaultsDeep({}, base, {
            target: 'web',
            entry: {
                'scratch-gui': './src/index.js'
            },
            output: {
                libraryTarget: 'umd',
                path: path.resolve('dist')
            },
            externals: {
                React: 'react',
                ReactDOM: 'react-dom'
            },
            module: {
                rules: base.module.rules.concat([
                    {
                        test: /\.(svg|png|wav|gif|jpg)$/,
                        loader: 'file-loader',
                        options: {
                            outputPath: 'static/assets/',
                            publicPath: '/static/assets/'
                        }
                    }
                ])
            },
            plugins: base.plugins.concat([
                new webpack.DefinePlugin({
                    'process.env.ROBBO_BUILD_VERSION_SUFFIX': '"-web"',
                    'process.env.RS3_ACTIVATION_BASE_URL': JSON.stringify(process.env.RS3_ACTIVATION_BASE_URL || ''),
                    'process.env.ROBBO_ACCOUNT_API_URL': JSON.stringify(process.env.ROBBO_ACCOUNT_API_URL || ''),
                    'process.env.ROBBO_ACCOUNT_LK_URL': JSON.stringify(process.env.ROBBO_ACCOUNT_LK_URL || ''),
                    'process.env.ROBBO_LMS_URL': JSON.stringify(process.env.ROBBO_LMS_URL || '')
                }),
                new CopyWebpackPlugin([{
                    from: 'node_modules/scratch-blocks/media',
                    to: 'static/blocks-media'
                }]),
                new CopyWebpackPlugin([{
                    from: isProduction ? 'extension-worker.js' : 'extension-worker.{js,js.map}',
                    context: 'node_modules/scratch-vm/dist/web'
                }])
            ])
        })) : []
);
