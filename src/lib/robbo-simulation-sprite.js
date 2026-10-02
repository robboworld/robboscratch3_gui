/**
 * Default 2D simulation robot sprite (same source as RobboMenu.triggerSimEn).
 */
import spriteLibraryContent from './libraries/sprites.json';

/** Library entry name in sprites.json (with space). */
export const SIMULATION_ROBOT_SPRITE_LIBRARY_NAME = 'Robbo Platform';

export const SIMULATION_ROBOT_SPRITE_NAMES = [
    'Robbo Robot',
    SIMULATION_ROBOT_SPRITE_LIBRARY_NAME,
    'RobboPlatform' // legacy alias from older builds
];

/**
 * @param {import('scratch-vm')} vm
 * @returns {boolean}
 */
export const hasSimulationRobotSprite = function (vm) {
    if (!vm || !vm.runtime || !vm.runtime.targets) return false;
    return vm.runtime.targets.some(t =>
        t.isOriginal && !t.isStage && SIMULATION_ROBOT_SPRITE_NAMES.includes(t.sprite.name)
    );
};

/**
 * Bundled simulator skins are addressed by file name, not by md5, so they do not pass the
 * sprite3 schema (assetId must be a 32-char hex md5). Build a sprite2 description instead.
 * @param {object} item - sprite library entry (sprite3 JSON)
 * @returns {object} sprite2 JSON suitable for vm.addSprite
 */
export const librarySpriteToSprite2Json = function (item) {
    return {
        objName: item.name,
        sounds: (item.sounds || []).map(sound => ({
            soundName: sound.name,
            soundID: -1,
            md5: sound.md5ext,
            sampleCount: sound.sampleCount,
            rate: sound.rate,
            format: sound.format || ''
        })),
        costumes: (item.costumes || []).map(costume => ({
            costumeName: costume.name,
            baseLayerID: -1,
            baseLayerMD5: costume.md5ext,
            bitmapResolution: costume.bitmapResolution,
            rotationCenterX: costume.rotationCenterX,
            rotationCenterY: costume.rotationCenterY
        })),
        currentCostumeIndex: 0,
        scratchX: 0,
        scratchY: 0,
        scale: 1,
        direction: 90,
        rotationStyle: 'normal',
        isDraggable: false,
        visible: true,
        spriteInfo: {}
    };
};

/**
 * @returns {object|null} Sprite JSON suitable for vm.addSprite, or null if library missing.
 */
export const getDefaultSimulationRobotSpriteJson = function () {
    const item = spriteLibraryContent.find(s => s.name === SIMULATION_ROBOT_SPRITE_LIBRARY_NAME) ||
        spriteLibraryContent.find(s => s.name === 'RobboPlatform');
    if (!item) return null;
    const baseJson = item.json ? Object.assign({}, item.json) : librarySpriteToSprite2Json(item);
    if (!item.json || typeof baseJson.scale !== 'number' || !Number.isFinite(baseJson.scale)) {
        baseJson.scale = 0.2;
    }
    return Object.assign({}, baseJson, {objName: 'Robbo Robot', direction: 90});
};
