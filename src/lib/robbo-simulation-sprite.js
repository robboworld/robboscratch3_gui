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
 * @returns {object|null} Sprite JSON suitable for vm.addSprite, or null if library missing.
 */
export const getDefaultSimulationRobotSpriteJson = function () {
    const item = spriteLibraryContent.find(s => s.name === SIMULATION_ROBOT_SPRITE_LIBRARY_NAME) ||
        spriteLibraryContent.find(s => s.name === 'RobboPlatform');
    if (!item || !item.json) return null;
    const baseJson = Object.assign({}, item.json);
    if (typeof baseJson.scale !== 'number' || !Number.isFinite(baseJson.scale)) {
        baseJson.scale = 0.2;
    }
    return Object.assign({}, baseJson, {objName: 'Robbo Robot', direction: 90});
};
