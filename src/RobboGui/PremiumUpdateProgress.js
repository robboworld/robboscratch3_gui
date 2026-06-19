import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import classNames from 'classnames';
import styles from './PremiumUpdateProgress.css';
import formStyles from './RobboPaletteForm.css';
import {
    premiumUpdateConfirmThunk,
    premiumUpdateDismissThunk
} from './actions/licenseDemoActions';

const messages = defineMessages({
    title: {
        id: 'gui.RobboMenu.premium_update_progress_title',
        defaultMessage: 'Updating Robbo Scratch'
    },
    titleCheck: {
        id: 'gui.RobboMenu.premium_update_check_title',
        defaultMessage: 'Checking for updates'
    },
    titleConfirm: {
        id: 'gui.RobboMenu.premium_update_confirm_title',
        defaultMessage: 'Update available'
    },
    titleUptodate: {
        id: 'gui.RobboMenu.premium_update_uptodate_title',
        defaultMessage: 'Up to date'
    },
    titleError: {
        id: 'gui.RobboMenu.premium_update_error_title',
        defaultMessage: 'Update failed'
    },
    checking: {
        id: 'gui.RobboMenu.premium_update_checking',
        defaultMessage: 'Checking for updates on files.robbo.ru…'
    },
    downloading: {
        id: 'gui.RobboMenu.premium_update_downloading',
        defaultMessage: 'Downloading update {version}…'
    },
    installing: {
        id: 'gui.RobboMenu.premium_update_installing',
        defaultMessage: 'Installing update…'
    },
    installingHint: {
        id: 'gui.RobboMenu.premium_update_installing_hint',
        defaultMessage: 'Please wait — the app will restart automatically.'
    },
    available: {
        id: 'gui.RobboMenu.premium_update_available',
        defaultMessage: 'Version {version} is available. Update now?'
    },
    none: {
        id: 'gui.RobboMenu.premium_update_none',
        defaultMessage: 'You have the latest version ({version}).'
    },
    dismiss: {
        id: 'gui.RobboMenu.premium_update_dismiss',
        defaultMessage: 'Close'
    },
    confirmUpdate: {
        id: 'gui.RobboMenu.premium_update_confirm_button',
        defaultMessage: 'Update now'
    },
    cancel: {
        id: 'gui.RobboMenu.premium_update_cancel_button',
        defaultMessage: 'Cancel'
    },
    premium_error_license_inactive: {
        id: 'gui.licenseWindow.premium_error_license_inactive',
        defaultMessage: 'Activate a valid license first.'
    },
    premium_error_device_mismatch: {
        id: 'gui.licenseWindow.premium_error_device_mismatch',
        defaultMessage: 'License is bound to another device.'
    },
    premium_error_capability_denied: {
        id: 'gui.licenseWindow.premium_error_capability_denied',
        defaultMessage: 'License does not include premium auto-update.'
    },
    premium_error_addon_not_loaded: {
        id: 'gui.licenseWindow.premium_error_addon_not_loaded',
        defaultMessage: 'Paid addon is not loaded yet.'
    },
    premium_update_desktop_only: {
        id: 'gui.RobboMenu.premium_update_desktop_only',
        defaultMessage: 'Premium auto-update is available only in the Desktop app.'
    }
});

const ERROR_CODE_MESSAGES = {
    LICENSE_INACTIVE: messages.premium_error_license_inactive,
    DEVICE_BINDING_MISMATCH: messages.premium_error_device_mismatch,
    CAPABILITY_DENIED: messages.premium_error_capability_denied,
    ADDON_NOT_LOADED: messages.premium_error_addon_not_loaded,
    DESKTOP_ONLY: messages.premium_update_desktop_only
};

function resolveErrorText (intl, update) {
    const code = update.errorCode || '';
    if (ERROR_CODE_MESSAGES[code]) {
        return intl.formatMessage(ERROR_CODE_MESSAGES[code]);
    }
    return update.errorMessage || code || intl.formatMessage(messages.titleError);
}

function resolveTitle (intl, phase) {
    switch (phase) {
    case 'checking':
        return intl.formatMessage(messages.titleCheck);
    case 'confirm':
        return intl.formatMessage(messages.titleConfirm);
    case 'uptodate':
        return intl.formatMessage(messages.titleUptodate);
    case 'error':
        return intl.formatMessage(messages.titleError);
    default:
        return intl.formatMessage(messages.title);
    }
}

function PremiumUpdateProgress (props) {
    const {intl, update, onDismiss, onConfirm} = props;
    const phase = update && update.phase;
    if (!phase || phase === 'idle') {
        return null;
    }
    if (typeof document === 'undefined' || !document.body) {
        return null;
    }

    const latestVersion = update.latestVersion || '';
    const currentVersion = update.currentVersion || '';
    const progress = typeof update.progress === 'number' ? update.progress : 0;
    const isError = phase === 'error';
    const isInstalling = phase === 'installing';
    const isChecking = phase === 'checking';
    const isConfirm = phase === 'confirm';
    const isUptodate = phase === 'uptodate';
    const clampedProgress = Math.max(0, Math.min(100, progress));

    let statusText;
    if (isError) {
        statusText = resolveErrorText(intl, update);
    } else if (isChecking) {
        statusText = intl.formatMessage(messages.checking);
    } else if (isInstalling) {
        statusText = intl.formatMessage(messages.installing);
    } else if (isConfirm) {
        statusText = intl.formatMessage(messages.available, {version: latestVersion});
    } else if (isUptodate) {
        statusText = intl.formatMessage(messages.none, {version: currentVersion});
    } else {
        statusText = intl.formatMessage(messages.downloading, {version: latestVersion});
    }

    const headerIconClass = classNames(styles.headerIcon, {
        [styles.headerIconCheck]: isChecking,
        [styles.headerIconSuccess]: isUptodate,
        [styles.headerIconError]: isError,
        [styles.headerIconConfirm]: isConfirm
    });

    return ReactDOM.createPortal(
        <div
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            aria-labelledby="premium-update-progress-title"
        >
            <div className={styles.panel}>
                <div className={styles.header}>
                    <span
                        className={headerIconClass}
                        aria-hidden="true"
                    />
                    <h2
                        id="premium-update-progress-title"
                        className={styles.headerTitle}
                    >
                        {resolveTitle(intl, phase)}
                    </h2>
                </div>
                <div className={styles.body}>
                    {(isConfirm || (!isError && !isUptodate && !isChecking && latestVersion)) ? (
                        <span className={styles.versionBadge}>
                            {'v'}{latestVersion}
                        </span>
                    ) : null}
                    {isUptodate && currentVersion ? (
                        <span className={classNames(styles.versionBadge, styles.versionBadgeMuted)}>
                            {'v'}{currentVersion}
                        </span>
                    ) : null}
                    {isError ? (
                        <>
                            <div className={styles.errorBox}>
                                <p className={styles.errorText}>{statusText}</p>
                            </div>
                            <div className={styles.footer}>
                                <button
                                    type="button"
                                    className={formStyles.action_button}
                                    onClick={onDismiss}
                                >
                                    {intl.formatMessage(messages.dismiss)}
                                </button>
                            </div>
                        </>
                    ) : isConfirm ? (
                        <>
                            <p className={styles.status}>{statusText}</p>
                            <div className={classNames(styles.footer, styles.footerSplit)}>
                                <button
                                    type="button"
                                    className={classNames(formStyles.action_button, styles.secondaryButton)}
                                    onClick={onDismiss}
                                >
                                    {intl.formatMessage(messages.cancel)}
                                </button>
                                <button
                                    type="button"
                                    className={classNames(formStyles.action_button, styles.primaryButton)}
                                    onClick={onConfirm}
                                >
                                    {intl.formatMessage(messages.confirmUpdate)}
                                </button>
                            </div>
                        </>
                    ) : isUptodate ? (
                        <>
                            <div className={styles.successBox}>
                                <p className={styles.successText}>{statusText}</p>
                            </div>
                            <div className={styles.footer}>
                                <button
                                    type="button"
                                    className={formStyles.action_button}
                                    onClick={onDismiss}
                                >
                                    {intl.formatMessage(messages.dismiss)}
                                </button>
                            </div>
                        </>
                    ) : isChecking ? (
                        <div className={styles.installingRow}>
                            <span
                                className={styles.spinner}
                                aria-hidden="true"
                            />
                            <p className={styles.status}>{statusText}</p>
                        </div>
                    ) : (
                        <>
                            <p className={styles.status}>{statusText}</p>
                            <div className={styles.progressRow}>
                                <div className={styles.track}>
                                    <div
                                        className={classNames(styles.fill, {
                                            [styles.fillIndeterminate]: isInstalling
                                        })}
                                        style={isInstalling ? undefined : {
                                            width: `${clampedProgress}%`
                                        }}
                                    />
                                </div>
                                {!isInstalling ? (
                                    <p className={styles.percent}>{clampedProgress}%</p>
                                ) : null}
                            </div>
                            {isInstalling ? (
                                <div className={styles.installingRow}>
                                    <span
                                        className={styles.spinner}
                                        aria-hidden="true"
                                    />
                                    <p className={styles.installingHint}>
                                        {intl.formatMessage(messages.installingHint)}
                                    </p>
                                </div>
                            ) : null}
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

PremiumUpdateProgress.propTypes = {
    intl: intlShape.isRequired,
    onConfirm: PropTypes.func.isRequired,
    onDismiss: PropTypes.func.isRequired,
    update: PropTypes.shape({
        phase: PropTypes.string,
        progress: PropTypes.number,
        latestVersion: PropTypes.string,
        currentVersion: PropTypes.string,
        errorCode: PropTypes.string,
        errorMessage: PropTypes.string
    })
};

const mapStateToProps = state => ({
    update: state.scratchGui.license_demo.update
});

const mapDispatchToProps = dispatch => ({
    onDismiss: () => dispatch(premiumUpdateDismissThunk()),
    onConfirm: () => dispatch(premiumUpdateConfirmThunk())
});

export default injectIntl(connect(mapStateToProps, mapDispatchToProps)(PremiumUpdateProgress));
