import ScratchStorage from 'scratch-storage';

import defaultProject from './default-project';
import {getBundledSimulatorAssetUrl} from './robbo-bundled-simulator-asset-url';

/**
 * scratch-storage 2.x fetches assets from an inline (blob:) worker, which cannot
 * resolve document-relative URLs, so resolve local asset paths against the page.
 * @param {string} url - possibly relative URL
 * @returns {string} absolute URL when a document base is available
 */
const toAbsoluteUrl = url => {
    if (typeof document === 'undefined' || !document.baseURI) return url;
    try {
        return new URL(url, document.baseURI).href;
    } catch (e) {
        return url;
    }
};

/**
 * Wrapper for ScratchStorage which adds default web sources.
 * @todo make this more configurable
 */
class Storage extends ScratchStorage {
    constructor () {
        super();
        this.cacheDefaultProject();
    }
    addOfficialScratchWebStores () {
        // Projects and assets are not read from or written to any Scratch server:
        // assets come from the bundled library, projects from files and the Robbo account.
        this.addWebStore(
            [this.AssetType.ImageVector, this.AssetType.ImageBitmap, this.AssetType.Sound],
            this.getAssetGetConfig.bind(this)
        );
        this.addWebStore(
            [this.AssetType.Sound],
            asset => `static/extension-assets/scratch3_music/${asset.assetId}.${asset.dataFormat}`
        );
    }
    setProjectHost (projectHost) {
        this.projectHost = projectHost;
    }
    setProjectToken (projectToken) {
        this.projectToken = projectToken;
    }
    setAssetHost (assetHost) {
        this.assetHost = assetHost;
    }
    getAssetGetConfig (asset) {
        const bundled = getBundledSimulatorAssetUrl(asset.assetId, asset.dataFormat);
        if (bundled) return toAbsoluteUrl(bundled);
        return toAbsoluteUrl(`./static/assets/${asset.assetId}.${asset.dataFormat}`);
    }
    setTranslatorFunction (translator) {
        this.translator = translator;
        this.cacheDefaultProject();
    }
    cacheDefaultProject () {
        const defaultProjectAssets = defaultProject(this.translator);
        defaultProjectAssets.forEach(asset => this.builtinHelper._store(
            this.AssetType[asset.assetType],
            this.DataFormat[asset.dataFormat],
            asset.data,
            asset.id
        ));
    }
}

const storage = new Storage();

export default storage;
