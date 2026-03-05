/**
 * Shared settings load and apply for desktop GUI.
 * Used at app startup (RobboGui) and when opening the settings window.
 */

const PERSISTENT = 1;
const SETTINGS_FILENAME = 'settings.json';

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
