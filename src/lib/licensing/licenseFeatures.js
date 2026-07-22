import {defineMessages} from 'react-intl';
import {CAPABILITY_PREMIUM_AUTO_UPDATE} from '../../RobboGui/reducers/license';

/**
 * Real, currently-implemented paid capabilities shown in the License window
 * and activation success feedback. Add a new entry when shipping a capability.
 */
export const licenseFeatureMessages = defineMessages({
    premium_auto_update_title: {
        id: 'gui.licenseFeatures.premium_auto_update_title',
        defaultMessage: 'Automatic updates'
    },
    premium_auto_update_description: {
        id: 'gui.licenseFeatures.premium_auto_update_description',
        defaultMessage: 'Check for and install Robbo Scratch updates from the About window.'
    }
});

/**
 * @type {Array<{capability: string, titleMessage: object, descriptionMessage: object}>}
 */
export const LICENSE_FEATURES = [
    {
        capability: CAPABILITY_PREMIUM_AUTO_UPDATE,
        titleMessage: licenseFeatureMessages.premium_auto_update_title,
        descriptionMessage: licenseFeatureMessages.premium_auto_update_description
    }
];

/**
 * @param {string[]} capabilities
 * @returns {Array<{capability: string, titleMessage: object, descriptionMessage: object}>}
 */
export function featuresForCapabilities (capabilities) {
    const caps = Array.isArray(capabilities) ? capabilities : [];
    return LICENSE_FEATURES.filter(feature => caps.indexOf(feature.capability) >= 0);
}
