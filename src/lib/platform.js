/**
 * Safe process-like object for both web and desktop builds.
 * In browser process is undefined; in Electron it exists.
 * In NW.js Desktop lib.min.js injects real process/os and exposes them as window.__node_process__/__node_os__ (loads first).
 */
const node_process = (typeof window !== 'undefined' && window.__node_process__)
  ? window.__node_process__
  : ((typeof process !== 'undefined') ? process : { platform: '', arch: '' });

/**
 * Safe os-like object for both web and desktop builds.
 * In browser Node's os module is unavailable; use stub so code doesn't throw.
 */
const node_os = (typeof window !== 'undefined' && window.__node_os__)
  ? window.__node_os__
  : ((typeof process !== 'undefined' && process.versions && process.versions.node)
    ? require('os')
    : { release: () => '', cpus: () => [{ model: '' }] });

/**
 * True when running on desktop (Windows, Linux or macOS) — show Bluetooth settings and search UI.
 * In web build returns false (node_process.platform is '').
 */
function isDesktopWithBluetooth() {
  const p = node_process.platform;
  return p === 'win32' || p === 'linux' || p === 'darwin';
}

const EMPTY_SYSTEM_INFO = {
  platform: '',
  arch: '',
  release: '',
  cpuModel: '',
  osLabel: ''
};

/**
 * Returns system info (OS, arch, CPU) for the About window.
 * In Electron with preload: calls main via window.robboGetSystemInfo().
 * In Web or without preload: resolves with empty strings.
 * @returns {Promise<{ platform: string, arch: string, release: string, cpuModel: string, osLabel: string }>}
 */
function getSystemInfoAsync() {
  if (typeof window !== 'undefined' && typeof window.robboGetSystemInfo === 'function') {
    return window.robboGetSystemInfo().then(info => {
      if (info && typeof info === 'object') {
        return {
          platform: info.platform != null ? String(info.platform) : '',
          arch: info.arch != null ? String(info.arch) : '',
          release: info.release != null ? String(info.release) : '',
          cpuModel: info.cpuModel != null ? String(info.cpuModel) : '',
          osLabel: info.osLabel != null ? String(info.osLabel) : ''
        };
      }
      return EMPTY_SYSTEM_INFO;
    });
  }
  return Promise.resolve(EMPTY_SYSTEM_INFO);
}

export { node_process, node_os, isDesktopWithBluetooth, getSystemInfoAsync };
