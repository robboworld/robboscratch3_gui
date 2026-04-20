/**
 * Default 2D simulation quadcopter sprite with two costumes:
 *   - idle (propellers stopped)
 *   - flying (propellers spinning)
 */

export const SIMULATION_COPTER_SPRITE_NAMES = ['Robbo Quadcopter'];

export const COPTER_COSTUME_IDLE = 'idle';
export const COPTER_COSTUME_FLYING = 'flying';

/**
 * @param {import('scratch-vm')} vm
 * @returns {boolean}
 */
export const hasSimulationCopterSprite = function (vm) {
    if (!vm || !vm.runtime || !vm.runtime.targets) return false;
    return vm.runtime.targets.some(t =>
        t.isOriginal && !t.isStage && SIMULATION_COPTER_SPRITE_NAMES.includes(t.sprite.name)
    );
};

/**
 * @returns {object} Sprite JSON suitable for vm.addSprite.
 */
export const getDefaultSimulationCopterSpriteJson = function () {
    return {
        objName: 'Robbo Quadcopter',
        sounds: [],
        costumes: [
            {
                costumeName: COPTER_COSTUME_IDLE,
                baseLayerID: -1,
                baseLayerMD5: 'robbo_quadcopter_topdown.png',
                bitmapResolution: 2,
                rotationCenterX: 688,
                rotationCenterY: 384
            },
            {
                costumeName: COPTER_COSTUME_FLYING,
                baseLayerID: -1,
                baseLayerMD5: 'robbo_quadcopter_topdown_spinning.png',
                bitmapResolution: 2,
                rotationCenterX: 688,
                rotationCenterY: 384
            }
        ],
        currentCostumeIndex: 0,
        scratchX: 0,
        scratchY: 0,
        scale: 0.15,
        direction: 90,
        rotationStyle: 'normal',
        isDraggable: true,
        visible: true,
        spriteInfo: {}
    };
};
