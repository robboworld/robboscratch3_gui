import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import classNames from 'classnames';
import styles from './LicenseActivationFeedback.css';
import formStyles from './RobboPaletteForm.css';
import {licenseFeedbackDismissThunk} from './actions/licenseActions';
import {
    LICENSE_FEATURES,
    featuresForCapabilities
} from '../lib/licensing/licenseFeatures';

const messages = defineMessages({
    title_success: {
        id: 'gui.licenseFeedback.title_success',
        defaultMessage: 'License activated'
    },
    title_error: {
        id: 'gui.licenseFeedback.title_error',
        defaultMessage: 'Could not activate license'
    },
    success_body: {
        id: 'gui.licenseFeedback.success_body',
        defaultMessage: 'Your license is active. Unlocked features:'
    },
    success_body_empty: {
        id: 'gui.licenseFeedback.success_body_empty',
        defaultMessage: 'Your license is active.'
    },
    ok: {
        id: 'gui.licenseFeedback.ok',
        defaultMessage: 'Great'
    },
    close: {
        id: 'gui.licenseFeedback.close',
        defaultMessage: 'Close'
    },
    try_again: {
        id: 'gui.licenseFeedback.try_again',
        defaultMessage: 'Try again'
    },
    error_empty_license_key: {
        id: 'gui.licenseWindow.error_empty_license_key',
        defaultMessage: 'Enter a license key.'
    },
    error_capability_denied: {
        id: 'gui.licenseWindow.error_capability_denied',
        defaultMessage: 'License has no premium capabilities.'
    },
    error_device_link_expired: {
        id: 'gui.licenseWindow.error_device_link_expired',
        defaultMessage: 'Confirmation timed out. Try Sign in with Robbo ID again.'
    },
    error_empty_activation_base: {
        id: 'gui.licenseWindow.error_empty_activation_base',
        defaultMessage: 'Set the activation server base URL first.'
    },
    error_invalid_key: {
        id: 'gui.licenseFeedback.error_invalid_key',
        defaultMessage: 'This license key is invalid. Check the key and try again.'
    },
    error_seat_limit: {
        id: 'gui.licenseFeedback.error_seat_limit',
        defaultMessage:
            'Device limit for this license has been reached. Free a seat in your Robbo account, then try again.'
    },
    error_subscription_expired: {
        id: 'gui.licenseFeedback.error_subscription_expired',
        defaultMessage: 'This subscription has expired. Renew it in your Robbo account.'
    },
    error_device_fingerprint: {
        id: 'gui.licenseFeedback.error_device_fingerprint',
        defaultMessage: 'Could not identify this device. Restart the app and try again.'
    },
    error_network: {
        id: 'gui.licenseFeedback.error_network',
        defaultMessage: 'Could not reach the activation server. Check your connection and try again.'
    },
    error_generic: {
        id: 'gui.licenseFeedback.error_generic',
        defaultMessage: 'Activation failed. Please try again or contact support.'
    }
});

const ERROR_CODE_MESSAGES = {
    empty_license_key: messages.error_empty_license_key,
    capability_denied: messages.error_capability_denied,
    device_link_expired: messages.error_device_link_expired,
    empty_activation_base: messages.error_empty_activation_base,
    INVALID_KEY: messages.error_invalid_key,
    SEAT_LIMIT_REACHED: messages.error_seat_limit,
    SUBSCRIPTION_EXPIRED: messages.error_subscription_expired,
    DEVICE_FINGERPRINT_REQUIRED: messages.error_device_fingerprint,
    activation_invalid_json: messages.error_network,
    device_link_invalid_json: messages.error_network,
    device_link_poll_invalid_json: messages.error_network,
    Failed: messages.error_network
};

/**
 * Map activation error codes / raw messages to localized user text.
 * @param {object} intl
 * @param {string} code
 * @param {string} [fallbackMessage]
 * @returns {string}
 */
export function resolveActivationErrorMessage (intl, code, fallbackMessage) {
    const raw = String(code || fallbackMessage || '').trim();
    if (!raw) {
        return intl.formatMessage(messages.error_generic);
    }
    if (ERROR_CODE_MESSAGES[raw]) {
        return intl.formatMessage(ERROR_CODE_MESSAGES[raw]);
    }
    const upper = raw.toUpperCase();
    if (ERROR_CODE_MESSAGES[upper]) {
        return intl.formatMessage(ERROR_CODE_MESSAGES[upper]);
    }
    if (
        /failed to fetch|networkerror|network request failed|load failed|timeout/i.test(raw) ||
        /^activation_http_/.test(raw) ||
        /^device_link_http_/.test(raw) ||
        /^device_link_poll_http_/.test(raw)
    ) {
        return intl.formatMessage(messages.error_network);
    }
    if (/^[A-Z0-9_]+$/.test(raw) || /^[a-z0-9_]+$/.test(raw)) {
        return intl.formatMessage(messages.error_generic);
    }
    return raw;
}

function LicenseActivationFeedback (props) {
    const {intl, feedback, onDismiss} = props;
    const phase = feedback && feedback.phase;
    if (!phase || phase === 'idle') {
        return null;
    }
    if (typeof document === 'undefined' || !document.body) {
        return null;
    }

    const isError = phase === 'error';
    const grantedFeatures = featuresForCapabilities(feedback.capabilities || []);
    const unknownCaps = (feedback.capabilities || []).filter(cap =>
        LICENSE_FEATURES.every(feature => feature.capability !== cap)
    );

    const title = isError
        ? intl.formatMessage(messages.title_error)
        : intl.formatMessage(messages.title_success);

    const errorText = isError
        ? resolveActivationErrorMessage(
            intl,
            feedback.errorCode,
            feedback.errorMessage
        )
        : '';

    return ReactDOM.createPortal(
        <div
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            aria-labelledby="license-activation-feedback-title"
        >
            <div className={styles.panel}>
                <div className={styles.header}>
                    <span
                        className={classNames(styles.headerIcon, {
                            [styles.headerIconError]: isError
                        })}
                        aria-hidden="true"
                    />
                    <h2
                        id="license-activation-feedback-title"
                        className={styles.headerTitle}
                    >
                        {title}
                    </h2>
                </div>
                <div className={styles.body}>
                    {isError ? (
                        <>
                            <div className={styles.errorBox}>
                                <p className={styles.errorText}>{errorText}</p>
                            </div>
                            <div className={classNames(styles.footer, styles.footerSplit)}>
                                <button
                                    type="button"
                                    className={classNames(
                                        formStyles.action_button,
                                        styles.secondaryButton
                                    )}
                                    onClick={onDismiss}
                                >
                                    {intl.formatMessage(messages.close)}
                                </button>
                                <button
                                    type="button"
                                    className={classNames(
                                        formStyles.action_button,
                                        styles.primaryButton
                                    )}
                                    onClick={onDismiss}
                                >
                                    {intl.formatMessage(messages.try_again)}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className={styles.successBox}>
                                <p className={styles.successText}>
                                    {grantedFeatures.length || unknownCaps.length
                                        ? intl.formatMessage(messages.success_body)
                                        : intl.formatMessage(messages.success_body_empty)}
                                </p>
                            </div>
                            {(grantedFeatures.length || unknownCaps.length) ? (
                                <ul className={styles.capabilityList}>
                                    {grantedFeatures.map(feature => (
                                        <li
                                            key={feature.capability}
                                            className={styles.capabilityItem}
                                        >
                                            <span
                                                className={styles.capabilityCheck}
                                                aria-hidden="true"
                                            />
                                            <span>
                                                {intl.formatMessage(feature.titleMessage)}
                                            </span>
                                        </li>
                                    ))}
                                    {unknownCaps.map(cap => (
                                        <li
                                            key={cap}
                                            className={styles.capabilityItem}
                                        >
                                            <span
                                                className={styles.capabilityCheck}
                                                aria-hidden="true"
                                            />
                                            <span>{cap}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                            <div className={styles.footer}>
                                <button
                                    type="button"
                                    className={classNames(
                                        formStyles.action_button,
                                        styles.primaryButton
                                    )}
                                    onClick={onDismiss}
                                >
                                    {intl.formatMessage(messages.ok)}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

LicenseActivationFeedback.propTypes = {
    feedback: PropTypes.shape({
        phase: PropTypes.string,
        capabilities: PropTypes.arrayOf(PropTypes.string),
        errorCode: PropTypes.string,
        errorMessage: PropTypes.string
    }),
    intl: intlShape.isRequired,
    onDismiss: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    feedback: state.scratchGui.license.feedback
});

const mapDispatchToProps = dispatch => ({
    onDismiss: () => dispatch(licenseFeedbackDismissThunk())
});

export default injectIntl(
    connect(mapStateToProps, mapDispatchToProps)(LicenseActivationFeedback)
);
