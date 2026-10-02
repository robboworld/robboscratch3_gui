const path = require('path');
const webpack = require('webpack');

// Plugins
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const ScratchWebpackConfigBuilder = require('scratch-webpack-configuration');

const isProduction = process.env.NODE_ENV === 'production';
const shouldBuildLibraryDist = process.env.BUILD_MODE === 'dist';
// BUILD_MODE=app (scripts/build.sh): only the editor, without upstream's example pages
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

const baseConfig = new ScratchWebpackConfigBuilder(
    {
        rootPath: path.resolve(__dirname),
        enableReact: true,
        shouldSplitChunks: false
    })
    .setTarget('browserslist')
    .merge({
        devtool: isProduction ? false : 'cheap-module-source-map',
        output: {
            assetModuleFilename: 'static/assets/[name].[hash][ext][query]',
            library: {
                name: 'GUI',
                type: 'umd2'
            }
        },
        resolve: {
            // scratch-vm / scratch-blocks / scratch-l10n are symlinks to the sibling Robbo forks
            symlinks: false,
            alias: {
                // The web build consumes the prebuilt bundles (absolute paths: package `exports` hide subpaths)
                'scratch-render$': path.resolve(__dirname, 'node_modules/scratch-render/dist/web/scratch-render.js'),
                'scratch-vm$': path.resolve(__dirname, 'node_modules/scratch-vm/dist/web/scratch-vm.js')
            },
            fallback: {
                Buffer: require.resolve('buffer/'),
                stream: require.resolve('stream-browserify'),
                // Node-only modules referenced by device/IoT dependencies; not available in the browser
                fs: false,
                path: false,
                os: false,
                crypto: false,
                net: false,
                tls: false
            }
        }
    })
    .addModuleRule({
        test: /\.(svg|png|wav|mp3|gif|jpg)$/,
        resourceQuery: /^$/, // reject any query string
        type: 'asset' // let webpack decide on the best type of asset
    })
    .addPlugin(new webpack.DefinePlugin({
        'process.env.DEBUG': Boolean(process.env.DEBUG),
        'process.env.GA_ID': `"${process.env.GA_ID || 'UA-000000-01'}"`,
        'process.env.GTM_ENV_AUTH': `"${process.env.GTM_ENV_AUTH || ''}"`,
        'process.env.GTM_ID': process.env.GTM_ID ? `"${process.env.GTM_ID}"` : null,
        'process.env.ROBBO_BUILD_VERSION_SUFFIX': '"-web"',
        'process.env.RS3_ACTIVATION_BASE_URL': JSON.stringify(process.env.RS3_ACTIVATION_BASE_URL || '')
    }))
    .addPlugin(new CopyWebpackPlugin({
        patterns: [
            {
                from: 'node_modules/scratch-blocks/media',
                to: 'static/blocks-media/default'
            },
            {
                from: 'node_modules/scratch-blocks/media',
                to: 'static/blocks-media/high-contrast'
            },
            {
                // overwrite some of the default block media with high-contrast versions
                // this entry must come after copying scratch-blocks/media into the high-contrast directory
                from: 'src/lib/themes/high-contrast/blocks-media',
                to: 'static/blocks-media/high-contrast',
                force: true
            },
            {
                context: 'node_modules/scratch-vm/dist/web',
                from: isProduction ? 'extension-worker.js' : 'extension-worker.{js,js.map}',
                noErrorOnMissing: true
            }
        ]
    }));

if (!process.env.CI) {
    baseConfig.addPlugin(new webpack.ProgressPlugin());
}

// build the shipping library in `dist/`
const distConfig = baseConfig.clone()
    .merge({
        entry: {
            'scratch-gui': path.join(__dirname, 'src/index.js')
        },
        output: {
            path: path.resolve(__dirname, 'dist')
        }
    })
    .addPlugin(
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'src/lib/libraries/*.json',
                    to: 'libraries',
                    flatten: true
                }
            ]
        })
    );

// build the editor (and, outside app builds, upstream's examples and debugging tools) in `build/`
const buildConfig = baseConfig.clone()
    .enableDevServer(process.env.PORT || 8601)
    .merge({
        devServer: {
            host: '127.0.0.1',
            headers: {
                'Permissions-Policy': 'unload=(self)'
            }
        },
        entry: isAppBuild ? {
            gui: './src/playground/index.jsx'
        } : {
            gui: './src/playground/index.jsx',
            blocksonly: './src/playground/blocks-only.jsx',
            compatibilitytesting: './src/playground/compatibility-testing.jsx',
            player: './src/playground/player.jsx'
        },
        output: {
            path: path.resolve(__dirname, 'build')
        }
    })
    .addPlugin(new HtmlWebpackPlugin({
        chunks: ['gui'],
        template: 'src/playground/index.ejs',
        title: 'Robbo Scratch | Роббо скретч — скретч онлайн для детей и школ, российская платформа для программирования',
        favicon: path.resolve(__dirname, 'static/favicon.png'),
        sentryConfig: process.env.SENTRY_CONFIG ? `"${process.env.SENTRY_CONFIG}"` : null,
        seo: webSeo,
        yandexMetrika: isProduction ? 93772324 : null
    }));

if (!isAppBuild) {
    buildConfig
        .addPlugin(new HtmlWebpackPlugin({
            chunks: ['blocksonly'],
            filename: 'blocks-only.html',
            template: 'src/playground/index.ejs',
            title: 'Scratch 3.0 GUI: Blocks Only Example'
        }))
        .addPlugin(new HtmlWebpackPlugin({
            chunks: ['compatibilitytesting'],
            filename: 'compatibility-testing.html',
            template: 'src/playground/index.ejs',
            title: 'Scratch 3.0 GUI: Compatibility Testing'
        }))
        .addPlugin(new HtmlWebpackPlugin({
            chunks: ['player'],
            filename: 'player.html',
            template: 'src/playground/index.ejs',
            title: 'Scratch 3.0 GUI: Player Example'
        }));
}

buildConfig.addPlugin(new CopyWebpackPlugin({
    patterns: [
        {
            from: 'static/seo/robots.txt',
            to: 'robots.txt'
        },
        {
            from: 'static/seo/sitemap.xml',
            to: 'sitemap.xml'
        },
        {
            from: 'static',
            to: 'static'
        },
        {
            from: 'extensions/**',
            to: 'static',
            context: 'src/examples'
        }
    ]
}));

// `dist/` (the embeddable library) roughly doubles build time; build it only on request:
// `BUILD_MODE=dist npm run build`
module.exports = shouldBuildLibraryDist ?
    [buildConfig.get(), distConfig.get()] :
    buildConfig.get();
