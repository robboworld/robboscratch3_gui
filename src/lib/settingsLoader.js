/**
 * Shared settings load and apply for desktop GUI.
 * Used at app startup (RobboGui) and when opening the settings window.
 */

const PERSISTENT = 1;
const SETTINGS_FILENAME = 'settings.json';

export const FIRMWARE_SETTINGS_DEFAULTS = Object.freeze({
  detect_timeout_ms: 3000,
  block_transmit_delay: 20,
  baud_rate: 115200
});

export const FIRMWARE_SETTINGS_LIMITS = Object.freeze({
  detect_timeout_ms: Object.freeze({ min: 1000, max: 10000 }),
  block_transmit_delay: Object.freeze({ min: 20, max: 200 }),
  baud_rate: Object.freeze({ min: 9600, max: 115200 })
});

function toRoundedNumber(value) {
  const rounded = Math.round(Number(value));
  return Number.isFinite(rounded) ? rounded : null;
}

function pickFirstDefined(...values) {
  for (let index = 0; index < values.length; index++) {
    if (values[index] != null) {
      return values[index];
    }
  }
  return undefined;
}

function normalizeFirmwareSetting(value, limits, fallback) {
  const normalizedValue = toRoundedNumber(value);
  if (normalizedValue != null && normalizedValue >= limits.min && normalizedValue <= limits.max) {
    return normalizedValue;
  }
  return fallback;
}

export function normalizeFirmwareSettings(rawSettings = {}) {
  return {
    detect_timeout_ms: normalizeFirmwareSetting(
      pickFirstDefined(
        rawSettings.firmware_detect_timeout_ms,
        rawSettings.firmware_flasher_nano_detect_timeout
      ),
      FIRMWARE_SETTINGS_LIMITS.detect_timeout_ms,
      FIRMWARE_SETTINGS_DEFAULTS.detect_timeout_ms
    ),
    block_transmit_delay: normalizeFirmwareSetting(
      rawSettings.firmware_block_transmit_delay,
      FIRMWARE_SETTINGS_LIMITS.block_transmit_delay,
      FIRMWARE_SETTINGS_DEFAULTS.block_transmit_delay
    ),
    baud_rate: normalizeFirmwareSetting(
      pickFirstDefined(
        rawSettings.firmware_baud_rate,
        rawSettings.firmware_null_lab_baud_rate
      ),
      FIRMWARE_SETTINGS_LIMITS.baud_rate,
      FIRMWARE_SETTINGS_DEFAULTS.baud_rate
    )
  };
}

export function getFirmwareSettingsStorageData(rawSettings = {}) {
  const firmwareSettings = normalizeFirmwareSettings(rawSettings);
  return {
    firmware_detect_timeout_ms: firmwareSettings.detect_timeout_ms,
    firmware_block_transmit_delay: firmwareSettings.block_transmit_delay,
    firmware_baud_rate: firmwareSettings.baud_rate
  };
}

export function getFirmwareSettingsFromRuntime(runtime) {
  if (!runtime) {
    return normalizeFirmwareSettings();
  }

  return normalizeFirmwareSettings({
    firmware_detect_timeout_ms: runtime.firmware_detect_timeout_ms,
    firmware_block_transmit_delay: runtime.firmware_block_transmit_delay,
    firmware_baud_rate: runtime.firmware_baud_rate
  });
}

export function applyFirmwareSettingsToRuntime(vm, settingsData = {}) {
  const firmwareSettings = normalizeFirmwareSettings(settingsData);
  if (!vm || !vm.runtime) {
    return firmwareSettings;
  }

  const runtime = vm.runtime;
  runtime.firmware_detect_timeout_ms = firmwareSettings.detect_timeout_ms;
  runtime.firmware_block_transmit_delay = firmwareSettings.block_transmit_delay;
  runtime.firmware_baud_rate = firmwareSettings.baud_rate;

  return firmwareSettings;
}

/**
 * Reads settings.json from webkit persistent storage.
 * @returns {Promise<{ file_exists: boolean, file: string | null, err?: any }>}
 */
export function getSettingsFromStorage() {
  return new Promise((resolve) => {
    function errorHandler(e) {
      console.error('File error during settings reading: ' + e);
      resolve({ file_exists: false, file: null, err: e });
    }

    function onInitFs(fs) {
      fs.root.getFile(SETTINGS_FILENAME, { create: false }, (fileEntry) => {
        fileEntry.file((file) => {
          const reader = new FileReader();
          reader.onloadend = function () {
            if (typeof this !== 'undefined' && this.result != null) {
              resolve({ file_exists: true, file: this.result, err: null });
            } else {
              resolve({ file_exists: false, file: null, err: null });
            }
          };
          reader.readAsText(file);
        }, (e) => {
          resolve({ file_exists: false, file: null, err: e });
        });
      }, errorHandler);
    }

    if (typeof navigator !== 'undefined' && navigator.webkitPersistentStorage && navigator.webkitPersistentStorage.requestQuota) {
      navigator.webkitPersistentStorage.requestQuota(500 * 1024 * 1024, (grantedBytes) => {
        if (typeof window !== 'undefined' && window.webkitRequestFileSystem) {
          window.webkitRequestFileSystem(PERSISTENT, grantedBytes, onInitFs, errorHandler);
        } else {
          resolve({ file_exists: false, file: null, err: new Error('webkitRequestFileSystem not available') });
        }
      }, errorHandler);
    } else {
      resolve({ file_exists: false, file: null, err: new Error('webkitPersistentStorage not available') });
    }
  });
}

/**
 * Applies parsed settings object to DCA (intervals and bluetooth_search_enabled).
 * Single place where settings are pushed to DeviceControlAPI.
 * @param {object} vm - VM with getDCA()
 * @param {object} settingsData - Parsed settings object
 */
export function applySettingsToDCA(vm, settingsData) {
  if (!vm || typeof vm.getDCA !== 'function') return;
  const dca = vm.getDCA();
  if (dca && typeof dca.set_all_intervals_in_dca === 'function') {
    dca.set_all_intervals_in_dca(settingsData);
  }
  if (dca && typeof dca.set_all_intervals_in_bluetooth === 'function') {
    dca.set_all_intervals_in_bluetooth(settingsData);
  }
}
