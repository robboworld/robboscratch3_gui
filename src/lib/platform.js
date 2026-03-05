/**
 * Safe process-like object for both web and desktop builds.
 * In browser process is undefined; in Electron it exists.
 * Use this instead of global process/node_process in GUI code shared by web and desktop.
 */
const node_process = (typeof process !== 'undefined') ? process : { platform: '', arch: '' };

/**
 * Safe os-like object for both web and desktop builds.
 * In browser Node's os module is unavailable; use stub so code doesn't throw.
 */
const node_os = (typeof process !== 'undefined' && process.versions && process.versions.node)
  ? require('os')
  : { release: () => '', cpus: () => [{ model: '' }] };

/**
 * True when running on desktop (Windows, Linux or macOS) — show Bluetooth settings and search UI.
 * In web build returns false (node_process.platform is '').
 */
function isDesktopWithBluetooth() {
  const p = node_process.platform;
  return p === 'win32' || p === 'linux' || p === 'darwin';
}

export { node_process, node_os, isDesktopWithBluetooth };
