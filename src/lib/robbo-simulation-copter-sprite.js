/**
 * Default 2D simulation quadcopter sprite with two costumes:
 *   - idle (propellers stopped)
 *   - flying (propellers spinning)
 */
import spriteLibraryContent from './libraries/sprites.json';
import {librarySpriteToSprite2Json} from './robbo-simulation-sprite';

export const SIMULATION_COPTER_SPRITE_NAMES = ['Robbo Quadcopter'];

/** "Robbo Quadcopter" is copter 1, "Robbo Quadcopter N" (or a duplicate "Robbo Quadcopter2") copter N. */
const COPTER_SPRITE_NAME_PATTERN = /^Robbo Quadcopter\s*(\d*)$/;

/**
 * @param {object} target rendered target
 * @returns {boolean} true for an original simulator copter sprite
 */
export const isSimulationCopterTarget = function (target) {
    return Boolean(target && target.isOriginal && !target.isStage && target.sprite &&
        COPTER_SPRITE_NAME_PATTERN.test(target.sprite.name));
};

export const COPTER_COSTUME_IDLE = 'idle';
export const COPTER_COSTUME_FLYING = 'flying';

/**
 * @param {import('scratch-vm')} vm
 * @returns {boolean}
 */
export const hasSimulationCopterSprite = function (vm) {
    if (!vm || !vm.runtime || !vm.runtime.targets) return false;
    return vm.runtime.targets.some(isSimulationCopterTarget);
};

/**
 * @returns {object} Sprite JSON suitable for vm.addSprite.
 */
export const getDefaultSimulationCopterSpriteJson = function () {
    const item = spriteLibraryContent.find(s => s.name === 'Robbo Quadcopter');
    if (item && item.json) return Object.assign({}, item.json);
    if (item) {
        return Object.assign(librarySpriteToSprite2Json(item), {
            scale: 1,
            direction: 90,
            isDraggable: true
        });
    }

    return {
        objName: 'Robbo Quadcopter',
        sounds: [],
        costumes: [
            {
                costumeName: COPTER_COSTUME_IDLE,
                baseLayerID: -1,
                baseLayerMD5: 'robbo_quadcopter_topdown_v2.png',
                bitmapResolution: 2,
                rotationCenterX: 32,
                rotationCenterY: 32
            },
            {
                costumeName: COPTER_COSTUME_FLYING,
                baseLayerID: -1,
                baseLayerMD5: 'robbo_quadcopter_topdown_v2_spinning.png',
                bitmapResolution: 2,
                rotationCenterX: 32,
                rotationCenterY: 32
            }
        ],
        currentCostumeIndex: 0,
        scratchX: 0,
        scratchY: 0,
        scale: 1,
        direction: 90,
        rotationStyle: 'normal',
        isDraggable: true,
        visible: true,
        spriteInfo: {}
    };
};
