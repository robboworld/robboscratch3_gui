import {defineMessages} from 'react-intl';

/**
 * Why a Desktop licence does not apply here (`license.reason`): set by the start-up check of the
 * offline token or by the ЛК answer to a token refresh.
 */
export const LICENSE_REASON_EXPIRED = 'expired';
export const LICENSE_REASON_NOT_YET_VALID = 'not_yet_valid';
export const LICENSE_REASON_REVOKED = 'revoked';
export const LICENSE_REASON_SEAT_REMOVED = 'seat_removed';
export const LICENSE_REASON_OTHER_DEVICE = 'other_device';
export const LICENSE_REASON_INVALID = 'invalid';

/** Reasons after which the token is useless here and is removed (expired ones may be renewed). */
export const LICENSE_REASONS_DROPPING_TOKEN = [
    LICENSE_REASON_REVOKED,
    LICENSE_REASON_SEAT_REMOVED,
    LICENSE_REASON_OTHER_DEVICE,
    LICENSE_REASON_INVALID
];

export const licenseReasonMessages = defineMessages({
    expired: {
        id: 'gui.licenseReason.expired',
        description: 'License window / start-up notice: the licence term is over',
        defaultMessage: 'The licence expired on {date}.'
    },
    not_yet_valid: {
        id: 'gui.licenseReason.not_yet_valid',
        description: 'License window: the licence starts later',
        defaultMessage: 'The licence starts on {date}.'
    },
    revoked: {
        id: 'gui.licenseReason.revoked',
        description: 'License window / start-up notice: the licence was revoked in the personal account',
        defaultMessage: 'The licence was revoked in your Robbo account.'
    },
    seat_removed: {
        id: 'gui.licenseReason.seat_removed',
        description: 'License window / start-up notice: this computer was removed from the licence',
        defaultMessage: 'This computer was removed from the licence in your Robbo account. ' +
            'Activate the licence again to use it here.'
    },
    other_device: {
        id: 'gui.licenseReason.other_device',
        description: 'License window / start-up notice: the device fingerprint changed',
        defaultMessage: 'The licence was activated on another computer (the hardware has changed). ' +
            'Activate it again; the old computer can be removed in your Robbo account.'
    },
    invalid: {
        id: 'gui.licenseReason.invalid',
        description: 'License window / start-up notice: the stored licence cannot be verified',
        defaultMessage: 'The licence file is damaged. Activate the licence again.'
    }
});

/**
 * @param {object} intl react-intl
 * @param {string} reason a LICENSE_REASON_* value
 * @param {string} [date] formatted date for expired / not yet valid
 * @returns {string} the text for the reason, '' for an unknown one
 */
export function formatLicenseReason (intl, reason, date) {
    const message = licenseReasonMessages[reason];
    return message ? intl.formatMessage(message, {date: date || '—'}) : '';
}
