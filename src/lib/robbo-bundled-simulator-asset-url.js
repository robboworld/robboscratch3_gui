/**
 * Bundled 2D simulator skins under static/robbo_assets/simulator/.
 * assetId from SB2/VM is the filename stem (e.g. robot_platform_top_down_black_v2).
 */

export const ROBBO_SIMULATOR_SUBPATH = './static/robbo_assets/simulator';

export const BUNDLED_PREFIX = 'robot_platform_top_down';
export const BUNDLED_COPTER_PREFIX = 'robbo_quadcopter_topdown';

/**
 * @param {string} [stem] - asset id without extension
 * @returns {boolean} true if this stem maps to a bundled simulator skin file
 */
export const isBundledSimulatorAssetStem = function (stem) {
    if (stem === null || stem === void 0) return false;
    const s = String(stem);
    return s.startsWith(BUNDLED_PREFIX) || s.startsWith(BUNDLED_COPTER_PREFIX);
};

/**
 * Library md5 / icon field may be full filename e.g. robot_platform_top_down_black_v2.png
 * @param {string} [md5OrName] - md5 field from library JSON
 * @returns {boolean} true if the file lives under robbo_assets/simulator
 */
export const isBundledSimulatorLibraryMd5 = function (md5OrName) {
    if (md5OrName === null || md5OrName === void 0) return false;
    const s = String(md5OrName);
    const base = s.includes('/') ? s.split('/').pop() : s;
    return base.startsWith(BUNDLED_PREFIX) || base.startsWith(BUNDLED_COPTER_PREFIX);
};

/**
 * @param {string} assetId - stem without extension
 * @param {string} dataFormat - e.g. png
 * @returns {string|null} relative URL or null if not bundled
 */
export const getBundledSimulatorAssetUrl = function (assetId, dataFormat) {
    if (!isBundledSimulatorAssetStem(assetId)) return null;
    const ext = (dataFormat && String(dataFormat).toLowerCase()) || 'png';
    return `${ROBBO_SIMULATOR_SUBPATH}/${assetId}.${ext}`;
};

/**
 * @param {string} libraryMd5 - e.g. robot_platform_top_down_black_v2.png
 * @returns {string|null} relative URL or null if not bundled
 */
export const getBundledSimulatorUrlFromLibraryMd5 = function (libraryMd5) {
    if (!isBundledSimulatorLibraryMd5(libraryMd5)) return null;
    return `${ROBBO_SIMULATOR_SUBPATH}/${libraryMd5}`;
};
