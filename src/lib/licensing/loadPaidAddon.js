import paidAddonRegistry from './paidAddonRegistry';

const LS_MANIFEST = 'rs3_demo_addon_manifest_url';
const LS_BUNDLE = 'rs3_demo_addon_bundle';

/**
 * Fetch manifest + bundle (or use cache), inject script, call global factory.
 *
 * @param {string} manifestUrl absolute URL
 * @returns {Promise<void>}
 */
export function loadPaidAddonFromManifestUrl (manifestUrl) {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
        return Promise.reject(new Error('no_dom'));
    }

    let bundleSource = null;
    try {
        if (typeof localStorage !== 'undefined') {
            const m = localStorage.getItem(LS_MANIFEST);
            const b = localStorage.getItem(LS_BUNDLE);
            if (m === manifestUrl && b && b.length > 20) {
                bundleSource = b;
            }
        }
    } catch (e) { /* ignore */ }

    const runInject = bundleSource =>
        new Promise((resolve, reject) => {
            paidAddonRegistry.reset();

            const blob = new Blob([bundleSource], {type: 'text/javascript'});
            const url = URL.createObjectURL(blob);
            const s = document.createElement('script');
            s.async = false;
            s.src = url;
            s.onload = () => {
                URL.revokeObjectURL(url);
                try {
                    if (typeof window.__RS3_PAID_ADDON_FACTORY__ !== 'function') {
                        throw new Error('addon_factory_missing');
                    }
                    window.__RS3_PAID_ADDON_FACTORY__(paidAddonRegistry.getHooksForBootstrap());
                } catch (err) {
                    reject(err);
                    return;
                }
                resolve(undefined);
            };
            s.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('addon_script_inject_failed'));
            };
            document.head.appendChild(s);
        });

    if (bundleSource) {
        return runInject(bundleSource);
    }

    return fetch(manifestUrl, {cache: 'no-store'})
        .then(manRes => {
            if (!manRes.ok) {
                throw new Error(`manifest_fetch_${manRes.status}`);
            }
            return manRes.json();
        })
        .then(manifest => {
            const bundlePath = manifest.bundle || manifest.bundlePath;
            if (!bundlePath) {
                throw new Error('manifest_no_bundle_field');
            }
            const bundleUrl = new URL(bundlePath, manifestUrl).href;
            return fetch(bundleUrl, {cache: 'no-store'})
                .then(bRes => {
                    if (!bRes.ok) {
                        throw new Error(`bundle_fetch_${bRes.status}`);
                    }
                    return bRes.text();
                })
                .then(text => {
                    try {
                        if (typeof localStorage !== 'undefined') {
                            localStorage.setItem(LS_MANIFEST, manifestUrl);
                            localStorage.setItem(LS_BUNDLE, text);
                        }
                    } catch (e) { /* ignore */ }
                    return runInject(text);
                });
        });
}
