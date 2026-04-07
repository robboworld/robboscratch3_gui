/**
 * Default 2D simulation robot sprite (same source as RobboMenu.triggerSimEn).
 */
import spriteLibraryContent from './libraries/sprites.json';

export const SIMULATION_ROBOT_SPRITE_NAMES = ['Robbo Robot', 'RobboPlatform', 'Robot'];

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
    const item = spriteLibraryContent.find(s => s.name === 'RobboPlatform') ||
        spriteLibraryContent.find(s => s.name === 'Robot') ||
        spriteLibraryContent[0];
    if (!item || !item.json) return null;
    const baseJson = Object.assign({}, item.json);
    if (typeof baseJson.scale !== 'number' || !Number.isFinite(baseJson.scale)) {
        baseJson.scale = 0.25;
    }
    return Object.assign({}, baseJson, {objName: 'Robbo Robot', direction: 90});
};
