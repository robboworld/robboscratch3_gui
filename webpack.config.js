// The GUI webpack config lives in the parent repo, one per transport platform:
// platforms/<platform>/webpack.config.gui.js. scripts/build.mjs passes it with --config;
// this selector serves a plain `npm start` / `npm run build` here (ROBBO_PLATFORM, web by default).
const fs = require('fs');
const path = require('path');

const platform = process.env.ROBBO_PLATFORM || 'web';
if (!['desktop', 'web'].includes(platform)) {
    throw new Error(`ROBBO_PLATFORM must be desktop or web, got "${platform}"`);
}

const platformConfig = path.resolve(__dirname, '..', 'platforms', platform, 'webpack.config.gui.js');
if (!fs.existsSync(platformConfig)) {
    throw new Error(`${platformConfig} not found: build robboscratch3_gui from the RobboScratch repo (scripts/build.sh)`);
}

module.exports = require(platformConfig);
