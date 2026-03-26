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

/**
 * Mobile browser without Web Serial — RobboLink bridge (ws://127.0.0.1) is the intended transport.
 * Aligns with platforms/web/robbolink-transport.js (also ?robbolink=1 / __ROBBOLINK_FORCE__ there).
 */
function isRobboLinkMobileWebContext() {
  if (typeof navigator === 'undefined') return false;
  const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
  return mobile && !navigator.serial;
}

const EMPTY_SYSTEM_INFO = {
  source: 'unknown',
  platform: '',
  arch: '',
  release: '',
  cpuModel: '',
  osLabel: '',
  browser: '',
  logicalCores: ''
};

function normalizeString(value) {
  return value == null ? '' : String(value).trim();
}

function getNodeRequire() {
  if (typeof window !== 'undefined' && typeof window.require === 'function') {
    return window.require;
  }
  if (typeof process !== 'undefined' && process.versions && process.versions.node &&
      typeof require === 'function') {
    return require;
  }
  return null;
}

function parseOsReleaseFromNode() {
  const nodeRequire = getNodeRequire();
  if (!nodeRequire) return null;

  try {
    const fs = nodeRequire('fs');
    const content = fs.readFileSync('/etc/os-release', 'utf8');
    return content.split('\n').reduce((result, line) => {
      const separatorIndex = line.indexOf('=');
      if (separatorIndex <= 0) return result;

      const key = line.slice(0, separatorIndex).trim();
      const rawValue = line.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^"/, '').replace(/"$/, '');

      if (key) result[key] = value;
      return result;
    }, {});
  } catch (_) {
    return null;
  }
}

function getLinuxPrettyNameFromNode() {
  if (normalizeString(node_process.platform) !== 'linux') return '';

  const osRelease = parseOsReleaseFromNode();
  if (!osRelease) return '';

  return osRelease.PRETTY_NAME ||
    [osRelease.NAME, osRelease.VERSION_ID].filter(Boolean).join(' ').trim();
}

function detectPlatformFromUserAgent(userAgent) {
  const ua = normalizeString(userAgent).toLowerCase();
  if (!ua) return '';
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'iOS';
  if (ua.includes('cros')) return 'ChromeOS';
  if (ua.includes('mac os x') || ua.includes('macintosh')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  return '';
}

function normalizePlatformLabel(platform, userAgent) {
  const rawPlatform = normalizeString(platform);
  const normalized = rawPlatform.toLowerCase();

  if (!normalized) return detectPlatformFromUserAgent(userAgent);
  if (normalized.includes('win')) return 'Windows';
  if (normalized.includes('mac')) return 'macOS';
  if (normalized.includes('iphone') || normalized.includes('ipad') || normalized.includes('ipod')) return 'iOS';
  if (normalized.includes('android')) return 'Android';
  if (normalized.includes('cros') || normalized.includes('chrome os')) return 'ChromeOS';
  if (normalized.includes('linux')) return 'Linux';

  return rawPlatform;
}

function formatBrand(brand) {
  return normalizeString(brand).replace(/\s+/g, ' ');
}

function formatBrowserLabel(brand, version) {
  const safeBrand = formatBrand(brand);
  const safeVersion = normalizeString(version);
  return safeVersion ? `${safeBrand} ${safeVersion}` : safeBrand;
}

function parseBrowserFromBrands(brands) {
  if (!Array.isArray(brands) || !brands.length) return '';

  const cleanedBrands = brands
    .map(item => ({
      brand: formatBrand(item && item.brand),
      version: normalizeString(item && item.version)
    }))
    .filter(item => item.brand && !/^not/i.test(item.brand));

  if (!cleanedBrands.length) return '';

  const preferredBrands = [
    'Microsoft Edge',
    'Google Chrome',
    'Opera',
    'Firefox',
    'Safari',
    'Chromium'
  ];

  for (const preferredBrand of preferredBrands) {
    const match = cleanedBrands.find(item => item.brand === preferredBrand);
    if (match) return formatBrowserLabel(match.brand, match.version);
  }

  return formatBrowserLabel(cleanedBrands[0].brand, cleanedBrands[0].version);
}

function parseBrowserFromUserAgent(userAgent) {
  const ua = normalizeString(userAgent);
  if (!ua) return '';

  const patterns = [
    { name: 'Microsoft Edge', regex: /Edg(?:A|iOS)?\/([0-9.]+)/ },
    { name: 'Opera', regex: /OPR\/([0-9.]+)/ },
    { name: 'Google Chrome', regex: /(?:Chrome|CriOS)\/([0-9.]+)/ },
    { name: 'Firefox', regex: /Firefox\/([0-9.]+)/ },
    { name: 'Safari', regex: /Version\/([0-9.]+).*Safari\// }
  ];

  for (const pattern of patterns) {
    const match = ua.match(pattern.regex);
    if (match) return formatBrowserLabel(pattern.name, match[1]);
  }

  return '';
}

function normalizeArchitectureName(architecture) {
  const safeArchitecture = normalizeString(architecture).toLowerCase();

  if (!safeArchitecture) return '';
  if (['x64', 'amd64', 'x86_64', 'x86-64'].includes(safeArchitecture)) return 'x86_64';
  if (['ia32', 'x86', 'i386', 'i486', 'i586', 'i686'].includes(safeArchitecture)) return 'x86';
  if (['arm64', 'aarch64'].includes(safeArchitecture)) return 'arm64';
  if (safeArchitecture === 'arm') return 'arm';

  return normalizeString(architecture);
}

function inferArchitectureBitness(architecture) {
  if (architecture === 'x86_64' || architecture === 'arm64') return '64';
  if (architecture === 'x86') return '32';
  return '';
}

function formatArchitectureDisplay(architecture, bitness) {
  let safeArchitecture = normalizeArchitectureName(architecture);
  let safeBitness = normalizeString(bitness);

  if (safeArchitecture === 'x86' && safeBitness === '64') safeArchitecture = 'x86_64';
  if (safeArchitecture === 'arm' && safeBitness === '64') safeArchitecture = 'arm64';

  if (!safeBitness) safeBitness = inferArchitectureBitness(safeArchitecture);

  if (safeArchitecture && safeBitness) return `${safeArchitecture} (${safeBitness}-bit)`;
  if (safeArchitecture) return safeArchitecture;
  if (safeBitness) return `${safeBitness}-bit`;
  return '';
}

function getLegacyDesktopSystemInfo() {
  const platform = normalizeString(node_process.platform);
  const release = typeof node_os.release === 'function' ? normalizeString(node_os.release()) : '';
  const cpus = typeof node_os.cpus === 'function' ? node_os.cpus() : [];
  const cpuModel = cpus.length && cpus[0] && cpus[0].model ? String(cpus[0].model) : '';
  const platformLabel = normalizePlatformLabel(platform, '');
  const linuxPrettyName = getLinuxPrettyNameFromNode();
  const osLabel = linuxPrettyName || [platformLabel, release].filter(Boolean).join(' ').trim();

  return {
    ...EMPTY_SYSTEM_INFO,
    source: 'desktop',
    platform: platform,
    arch: formatArchitectureDisplay(node_process.arch),
    release: release,
    cpuModel: cpuModel,
    osLabel: osLabel
  };
}

function getBrowserSystemInfo() {
  if (typeof navigator === 'undefined') return Promise.resolve(EMPTY_SYSTEM_INFO);

  const userAgent = normalizeString(navigator.userAgent);
  const userAgentData = navigator.userAgentData;
  const logicalCores = Number.isFinite(navigator.hardwareConcurrency) && navigator.hardwareConcurrency > 0
    ? String(navigator.hardwareConcurrency)
    : '';
  const platformLabel = normalizePlatformLabel(
    userAgentData && userAgentData.platform,
    userAgent
  ) || normalizePlatformLabel(navigator.platform, userAgent);
  const browserLabel = parseBrowserFromBrands(userAgentData && userAgentData.brands)
    || parseBrowserFromUserAgent(userAgent);
  const buildResult = architecture => ({
    ...EMPTY_SYSTEM_INFO,
    source: 'web',
    platform: platformLabel,
    osLabel: platformLabel,
    arch: architecture,
    browser: browserLabel,
    logicalCores: logicalCores
  });

  if (userAgentData && typeof userAgentData.getHighEntropyValues === 'function') {
    return userAgentData.getHighEntropyValues(['architecture', 'bitness'])
      .then(hints => buildResult(formatArchitectureDisplay(
        hints && hints.architecture,
        hints && hints.bitness
      )))
      .catch(() => buildResult(''));
  }

  return Promise.resolve(buildResult(''));
}

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
          source: 'desktop',
          platform: info.platform != null ? String(info.platform) : '',
          arch: formatArchitectureDisplay(info.arch),
          release: info.release != null ? String(info.release) : '',
          cpuModel: info.cpuModel != null ? String(info.cpuModel) : '',
          osLabel: info.osLabel != null ? String(info.osLabel) : '',
          browser: '',
          logicalCores: ''
        };
      }
      return EMPTY_SYSTEM_INFO;
    });
  }
  if (normalizeString(node_process.platform)) {
    return Promise.resolve(getLegacyDesktopSystemInfo());
  }
  if (typeof navigator !== 'undefined') {
    return getBrowserSystemInfo().catch(() => ({
      ...EMPTY_SYSTEM_INFO,
      source: 'web'
    }));
  }
  return Promise.resolve(EMPTY_SYSTEM_INFO);
}

export { node_process, node_os, isDesktopWithBluetooth, isRobboLinkMobileWebContext, getSystemInfoAsync, formatArchitectureDisplay };
