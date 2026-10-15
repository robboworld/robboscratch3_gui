import React, {Component} from 'react';
import {robboConfirm} from './RobboConfirmDialog';
import {connect} from 'react-redux';
import {defineMessages, injectIntl} from 'react-intl';
import classNames from 'classnames';

import sharedStyles from './DevicePaletteShared.css';
import formStyles from './RobboPaletteForm.css';
import styles from './LicenseWindowComponent.css';
import {ActionTriggerNewDraggableWindow} from './actions/sensor_actions';
import {
    activateLicenseThunk,
    persistActivationBaseUrlThunk,
    clearLicenseThunk,
    startDeviceLinkThunk,
    cancelDeviceLinkThunk,
    refreshLicenseThunk,
    releaseLicenseThunk
} from './actions/licenseActions';
import {
    LICENSE_REASON_EXPIRED,
    LICENSE_REASON_NOT_YET_VALID,
    LICENSE_REASON_REVOKED,
    formatLicenseReason
} from '../lib/licensing/licenseReasons';
import {LICENSE_FEATURES} from '../lib/licensing/licenseFeatures';
import {
    resolveAccountHomeUrl,
    resolveLicensesUrl,
    DESKTOP_DOWNLOAD_URL
} from '../lib/licensing/accountUrls';
import {startOidcLoginThunk} from './actions/robboAccountActions';
import {licensesPageUrl} from '../lib/robbo-account/cloudLimits';
import {isAuthUiEnabled} from '../lib/licensing/licenseUiEnabled';
import {isDesktopWithBluetooth, openExternalUrl} from '../lib/platform.js';
import {
    showTransientButtonFeedback,
    clearTransientButtonFeedbackTimer
} from '../lib/transient-button-feedback';

const COPY_FEEDBACK_KEY = 'copiedField';

const messages = defineMessages({
    title: {
        id: 'gui.licenseWindow.title',
        description: 'License window title',
        defaultMessage: 'License'
    },
    close: {
        id: 'gui.licenseWindow.close',
        defaultMessage: 'Close'
    },
    activation_url: {
        id: 'gui.licenseWindow.activation_url',
        defaultMessage: 'Activation server base URL'
    },
    robbo_id_login: {
        id: 'gui.licenseWindow.robbo_id_login',
        defaultMessage: 'Sign in with Robbo ID'
    },
    robbo_id_cancel: {
        id: 'gui.licenseWindow.robbo_id_cancel',
        defaultMessage: 'Cancel'
    },
    robbo_id_open_again: {
        id: 'gui.licenseWindow.robbo_id_open_again',
        defaultMessage: 'Open confirmation page again'
    },
    device_link_waiting: {
        id: 'gui.licenseWindow.device_link_waiting',
        defaultMessage:
            'Confirm code {code} in your Robbo account, then return here. Waiting…'
    },
    show_key_form: {
        id: 'gui.licenseWindow.show_key_form',
        defaultMessage: 'I have a license key'
    },
    hide_key_form: {
        id: 'gui.licenseWindow.hide_key_form',
        defaultMessage: 'Hide license key entry'
    },
    license_key: {
        id: 'gui.licenseWindow.license_key',
        defaultMessage: 'License key'
    },
    activate: {
        id: 'gui.licenseWindow.activate',
        defaultMessage: 'Activate'
    },
    deactivate_license: {
        id: 'gui.licenseWindow.deactivate_license',
        defaultMessage: 'Deactivate'
    },
    deactivate_yes: {
        id: 'gui.licenseWindow.deactivate_yes',
        description: 'Confirm button of the licence deactivation question',
        defaultMessage: 'Deactivate'
    },
    deactivate_cancel: {
        id: 'gui.licenseWindow.deactivate_cancel',
        description: 'Cancel button of the licence deactivation question',
        defaultMessage: 'Keep licence'
    },
    deactivate_confirm: {
        id: 'gui.licenseWindow.deactivate_confirm',
        defaultMessage:
            'Remove the license from this device? You can activate it again later.'
    },
    open_account: {
        id: 'gui.licenseWindow.open_account',
        defaultMessage: 'Personal account'
    },
    hint_dev: {
        id: 'gui.licenseWindow.hint_dev',
        defaultMessage:
            'Dev: use local ЛК (http://localhost:8080). Sign in with Robbo ID, or activate with a key from «My licenses».'
    },
    status_active: {
        id: 'gui.licenseWindow.status_active',
        defaultMessage: 'Active'
    },
    status_inactive: {
        id: 'gui.licenseWindow.status_inactive_short',
        defaultMessage: 'Not activated'
    },
    status_pending: {
        id: 'gui.licenseWindow.status_pending',
        defaultMessage: 'Waiting for confirmation…'
    },
    meta_status: {
        id: 'gui.licenseWindow.meta_status',
        defaultMessage: 'Status'
    },
    meta_valid_until: {
        id: 'gui.licenseWindow.meta_valid_until',
        defaultMessage: 'Valid until'
    },
    meta_tariff: {
        id: 'gui.licenseWindow.meta_tariff',
        description: 'License window: tariff of the licence (Individual, Class…)',
        defaultMessage: 'Tariff'
    },
    meta_owner: {
        id: 'gui.licenseWindow.meta_owner',
        description: 'License window: the account a personal licence belongs to',
        defaultMessage: 'Owner'
    },
    status_expired: {
        id: 'gui.licenseWindow.status_expired',
        description: 'License window status chip: the licence term is over',
        defaultMessage: 'Expired'
    },
    status_not_yet_valid: {
        id: 'gui.licenseWindow.status_not_yet_valid',
        description: 'License window status chip: the licence starts later',
        defaultMessage: 'Not started yet'
    },
    check_again: {
        id: 'gui.licenseWindow.check_again',
        description: 'License window: ask the server whether an expired licence was renewed',
        defaultMessage: 'Check again'
    },
    checking: {
        id: 'gui.licenseWindow.checking',
        description: 'License window: the renewal check is running',
        defaultMessage: 'Checking…'
    },
    renew_in_account: {
        id: 'gui.licenseWindow.renew_in_account',
        description: 'License window: open the licences page of the personal account to renew',
        defaultMessage: 'Renew in Robbo account'
    },
    deactivate_offline_confirm: {
        id: 'gui.licenseWindow.deactivate_offline_confirm',
        description: 'Question when the licence server cannot be reached on Deactivate',
        defaultMessage: 'The licence server cannot be reached. Deactivate the licence on this ' +
            'computer only? Its seat stays taken until you remove this computer in your Robbo account.'
    },
    deactivate_offline_yes: {
        id: 'gui.licenseWindow.deactivate_offline_yes',
        description: 'Confirm button: deactivate without freeing the seat on the server',
        defaultMessage: 'Deactivate here'
    },
    meta_no_expiry: {
        id: 'gui.licenseWindow.meta_no_expiry',
        defaultMessage: 'No expiry date'
    },
    meta_license_id: {
        id: 'gui.licenseWindow.meta_license_id',
        defaultMessage: 'License ID'
    },
    meta_seat_id: {
        id: 'gui.licenseWindow.meta_seat_id',
        defaultMessage: 'Device seat'
    },
    copy: {
        id: 'gui.licenseWindow.copy',
        defaultMessage: 'Copy'
    },
    copied: {
        id: 'gui.licenseWindow.copied',
        defaultMessage: 'Copied'
    },
    addon_issue: {
        id: 'gui.licenseWindow.addon_issue_short',
        defaultMessage: 'License OK, but paid features failed to load: {error}'
    },
    features_toggle: {
        id: 'gui.licenseWindow.features_toggle',
        defaultMessage: 'What\'s included with a license'
    },
    dev_settings: {
        id: 'gui.licenseWindow.dev_settings',
        defaultMessage: 'Developer settings'
    },
    web_signed_in: {
        id: 'gui.licenseWindow.web_signed_in',
        defaultMessage: 'Signed in as {name}'
    },
    web_projects: {
        id: 'gui.licenseWindow.web_projects',
        description: 'License window (browser): cloud projects of the account',
        defaultMessage: 'Cloud projects'
    },
    web_projects_of: {
        id: 'gui.licenseWindow.web_projects_of',
        description: 'License window (browser): saved projects out of the tariff limit',
        defaultMessage: '{count} of {limit}'
    },
    web_project_size: {
        id: 'gui.licenseWindow.web_project_size',
        description: 'License window (browser): largest project the tariff allows',
        defaultMessage: 'Project size'
    },
    web_project_size_value: {
        id: 'gui.licenseWindow.web_project_size_value',
        description: 'License window (browser): project size limit in megabytes',
        defaultMessage: 'up to {size} MB'
    },
    web_signed_out: {
        id: 'gui.licenseWindow.web_signed_out',
        defaultMessage: 'Not signed in'
    },
    web_account_hint: {
        id: 'gui.licenseWindow.web_account_hint',
        defaultMessage:
            'Cloud features (project sharing, editor extras, and similar) follow your Robbo account subscription. Device-linked premium features do not use this browser.'
    },
    web_sign_in: {
        id: 'gui.licenseWindow.web_sign_in',
        defaultMessage: 'Sign in to Robbo account'
    },
    web_manage_subscription: {
        id: 'gui.licenseWindow.web_manage_subscription',
        defaultMessage: 'Manage subscription'
    },
    web_desktop_note: {
        id: 'gui.licenseWindow.web_desktop_note',
        defaultMessage:
            'Automatic updates and IoT blocks require the Desktop app.'
    },
    web_download_desktop: {
        id: 'gui.licenseWindow.web_download_desktop',
        defaultMessage: 'Download Desktop'
    }
});

function shortenId (value, head = 8, tail = 4) {
    const text = String(value || '');
    if (text.length <= head + tail + 1) {
        return text;
    }
    return `${text.slice(0, head)}…${text.slice(-tail)}`;
}

class LicenseWindowComponent extends Component {
    constructor (props) {
        super(props);
        this.state = {
            licenseKeyDraft: '',
            showKeyForm: false,
            showFeatures: false,
            [COPY_FEEDBACK_KEY]: null
        };
        this.handleBaseChange = this.handleBaseChange.bind(this);
        this.handleKeyChange = this.handleKeyChange.bind(this);
        this.onActivateClick = this.onActivateClick.bind(this);
        this.onDeactivateClick = this.onDeactivateClick.bind(this);
        this.onCheckAgainClick = this.onCheckAgainClick.bind(this);
        this.onRobboIdClick = this.onRobboIdClick.bind(this);
        this.onCancelDeviceLinkClick = this.onCancelDeviceLinkClick.bind(this);
        this.onOpenVerificationAgain = this.onOpenVerificationAgain.bind(this);
        this.onToggleKeyForm = this.onToggleKeyForm.bind(this);
        this.onToggleFeatures = this.onToggleFeatures.bind(this);
        this.onCopyId = this.onCopyId.bind(this);
        this.onOpenAccountClick = this.onOpenAccountClick.bind(this);
        this.onOpenLicensesClick = this.onOpenLicensesClick.bind(this);
        this.onWebSignInClick = this.onWebSignInClick.bind(this);
        this.onDownloadDesktopClick = this.onDownloadDesktopClick.bind(this);
        this.close = this.close.bind(this);
    }

    componentWillUnmount () {
        clearTransientButtonFeedbackTimer(this, COPY_FEEDBACK_KEY);
    }

    close () {
        this.props.onLicenseWindowClose('license-window');
    }

    handleBaseChange (e) {
        this.props.onPersistActivationBase(e.target.value);
    }

    handleKeyChange (e) {
        this.setState({licenseKeyDraft: e.target.value});
    }

    onActivateClick () {
        const key = (this.state.licenseKeyDraft || '').trim();
        if (!key) {
            return;
        }
        this.props.onActivate(key);
    }

    onDeactivateClick () {
        robboConfirm({
            message: this.props.intl.formatMessage(messages.deactivate_confirm),
            confirmLabel: this.props.intl.formatMessage(messages.deactivate_yes),
            cancelLabel: this.props.intl.formatMessage(messages.deactivate_cancel),
            danger: true
        }).then(confirmed => {
            if (!confirmed) {
                return null;
            }
            this.setState({licenseKeyDraft: '', showKeyForm: false});
            // The seat goes back to the licence in the ЛК; without the server, ask first.
            return this.props.onReleaseLicense().then(result => {
                if (result !== 'offline') {
                    return null;
                }
                return robboConfirm({
                    message: this.props.intl.formatMessage(messages.deactivate_offline_confirm),
                    confirmLabel: this.props.intl.formatMessage(messages.deactivate_offline_yes),
                    cancelLabel: this.props.intl.formatMessage(messages.deactivate_cancel),
                    danger: true
                }).then(offlineConfirmed => {
                    if (offlineConfirmed) {
                        this.props.onClearLicense();
                    }
                });
            });
        });
    }

    onCheckAgainClick () {
        this.props.onRefreshLicense();
    }

    onOpenAccountClick () {
        const url = resolveAccountHomeUrl(this.props.license.activationBaseUrl);
        openExternalUrl(url);
    }

    onOpenLicensesClick () {
        // Desktop derives the ЛК site from the activation server when the build has no ЛК address.
        const url = isDesktopWithBluetooth() ?
            resolveLicensesUrl(this.props.license.activationBaseUrl) :
            licensesPageUrl();
        openExternalUrl(url);
    }

    onWebSignInClick () {
        // The same sign-in as the menu bar: through the ЛК and back to this editor.
        this.props.onStartSignIn();
    }

    onDownloadDesktopClick () {
        openExternalUrl(DESKTOP_DOWNLOAD_URL);
    }

    onRobboIdClick () {
        this.props.onStartDeviceLink();
    }

    onCancelDeviceLinkClick () {
        this.props.onCancelDeviceLink();
    }

    onOpenVerificationAgain () {
        const ld = this.props.license;
        const uri = (ld.deviceLinkVerificationUri || '').trim();
        const code = (ld.deviceLinkUserCode || '').trim();
        if (!uri) {
            return;
        }
        const openUrl = code
            ? `${uri.replace(/\/$/, '')}?code=${encodeURIComponent(code)}`
            : uri;
        openExternalUrl(openUrl);
    }

    onToggleKeyForm () {
        this.setState(prev => ({showKeyForm: !prev.showKeyForm}));
    }

    onToggleFeatures () {
        this.setState(prev => ({showFeatures: !prev.showFeatures}));
    }

    copyToClipboard (textToCopy, onSuccess) {
        const text = textToCopy != null ? String(textToCopy) : '';
        if (!text) {
            return;
        }
        const notifySuccess = () => {
            if (typeof onSuccess === 'function') {
                onSuccess();
            }
        };
        if (typeof navigator !== 'undefined' &&
            navigator.clipboard &&
            typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText(text)
                .then(notifySuccess)
                .catch(() => {
                    if (this.copyToClipboardWithExecCommand(text)) {
                        notifySuccess();
                    }
                });
            return;
        }
        if (this.copyToClipboardWithExecCommand(text)) {
            notifySuccess();
        }
    }

    copyToClipboardWithExecCommand (text) {
        if (typeof document === 'undefined' || !document.body) {
            return false;
        }
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        let copied = false;
        try {
            copied = document.execCommand('copy');
        } catch (e) {
            copied = false;
        }
        document.body.removeChild(textarea);
        return copied;
    }

    onCopyId (fieldKey, value) {
        this.copyToClipboard(value, () => {
            showTransientButtonFeedback(this, {
                stateKey: COPY_FEEDBACK_KEY,
                feedbackToken: fieldKey
            });
        });
    }

    formatExpiresAt (expiresAt) {
        if (typeof expiresAt !== 'number' || !expiresAt) {
            return this.props.intl.formatMessage(messages.meta_no_expiry);
        }
        const date = new Date(expiresAt * 1000);
        if (Number.isNaN(date.getTime())) {
            return this.props.intl.formatMessage(messages.meta_no_expiry);
        }
        try {
            return this.props.intl.formatDate(date, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            return `${day}.${month}.${date.getFullYear()}`;
        }
    }

    renderStatusChip () {
        const ld = this.props.license;
        const deviceLinkPending = ld.deviceLinkStatus === 'pending';
        if (deviceLinkPending) {
            return (
                <span
                    className={classNames(
                        styles.license_status_chip,
                        styles.license_status_chip_pending
                    )}
                    role="status"
                >
                    {this.props.intl.formatMessage(messages.status_pending)}
                </span>
            );
        }
        if (ld.status === 'valid_offline') {
            return (
                <span
                    className={classNames(
                        styles.license_status_chip,
                        styles.license_status_chip_active
                    )}
                    role="status"
                >
                    {this.props.intl.formatMessage(messages.status_active)}
                </span>
            );
        }
        if (ld.status === 'expired' || ld.status === 'not_yet_valid') {
            return (
                <span
                    className={classNames(
                        styles.license_status_chip,
                        styles.license_status_chip_error
                    )}
                    role="status"
                >
                    {this.props.intl.formatMessage(ld.status === 'expired' ?
                        messages.status_expired : messages.status_not_yet_valid)}
                </span>
            );
        }
        return (
            <span
                className={styles.license_status_chip}
                role="status"
            >
                {this.props.intl.formatMessage(messages.status_inactive)}
            </span>
        );
    }

    /**
     * Why the licence does not apply here, with what can be done about it.
     * @returns {?React.Element} the notice, null while the licence works
     */
    renderReasonNotice () {
        const ld = this.props.license;
        if (!ld.reason) {
            return null;
        }
        let date = '';
        if (ld.reason === LICENSE_REASON_EXPIRED) date = this.formatExpiresAt(ld.expiresAt);
        if (ld.reason === LICENSE_REASON_NOT_YET_VALID) date = this.formatExpiresAt(ld.notBefore);
        const expired = ld.reason === LICENSE_REASON_EXPIRED;
        return (
            <div className={styles.license_reason_notice}>
                <div
                    className={styles.license_addon_warning}
                    role="alert"
                >
                    {formatLicenseReason(this.props.intl, ld.reason, date)}
                </div>
                {expired ? (
                    <div className={styles.license_reason_actions}>
                        <button
                            type="button"
                            className={classNames(formStyles.action_button, styles.license_primary_button)}
                            disabled={ld.isRefreshing}
                            onClick={this.onCheckAgainClick}
                        >
                            {this.props.intl.formatMessage(ld.isRefreshing ? messages.checking : messages.check_again)}
                        </button>
                        <button
                            type="button"
                            className={classNames(formStyles.action_button, styles.license_button_secondary)}
                            onClick={this.onOpenLicensesClick}
                        >
                            {this.props.intl.formatMessage(messages.renew_in_account)}
                        </button>
                        <button
                            type="button"
                            className={styles.license_deactivate_button}
                            onClick={this.onDeactivateClick}
                        >
                            {this.props.intl.formatMessage(messages.deactivate_license)}
                        </button>
                    </div>
                ) : null}
                {ld.reason === LICENSE_REASON_REVOKED ? (
                    <div className={styles.license_reason_actions}>
                        <button
                            type="button"
                            className={classNames(formStyles.action_button, styles.license_button_secondary)}
                            onClick={this.onOpenAccountClick}
                        >
                            {this.props.intl.formatMessage(messages.open_account)}
                        </button>
                    </div>
                ) : null}
            </div>
        );
    }

    /**
     * Tariff, term and cloud limits of the signed-in account (GET /licensing/entitlements).
     * @returns {?React.Element} the rows, null until they are loaded
     */
    renderAccountRights () {
        const rights = this.props.robboAccountEntitlements;
        if (!rights || !rights.tariffName) {
            return null;
        }
        const intl = this.props.intl;
        const expiresAt = rights.expiresAt ? Math.floor(Date.parse(rights.expiresAt) / 1000) : 0;
        const rows = [{label: intl.formatMessage(messages.meta_tariff), value: rights.tariffName}];
        if (expiresAt > 0) {
            rows.push({label: intl.formatMessage(messages.meta_valid_until), value: this.formatExpiresAt(expiresAt)});
        }
        if (typeof rights.projectCount === 'number') {
            rows.push({
                label: intl.formatMessage(messages.web_projects),
                value: rights.maxProjects > 0 ?
                    intl.formatMessage(messages.web_projects_of, {
                        count: rights.projectCount,
                        limit: rights.maxProjects
                    }) :
                    String(rights.projectCount)
            });
        }
        if (rights.maxProjectSizeMb > 0) {
            rows.push({
                label: intl.formatMessage(messages.web_project_size),
                value: intl.formatMessage(messages.web_project_size_value, {size: rights.maxProjectSizeMb})
            });
        }
        return (
            <dl className={styles.license_meta_list}>
                {rows.map(row => (
                    <div
                        key={row.label}
                        className={styles.license_meta_row}
                    >
                        <dt className={styles.license_meta_label}>{row.label}</dt>
                        <dd className={styles.license_meta_value}>{row.value}</dd>
                    </div>
                ))}
            </dl>
        );
    }

    renderWebAccountPanel () {
        // No account in this shell (Android): only the note about the Desktop licence.
        if (!isAuthUiEnabled()) {
            return this.renderDesktopNote();
        }
        const authenticated = this.props.robboAccountSessionStatus === 'authenticated';
        const user = this.props.robboAccountUser;
        const displayName = (user && (user.displayName || user.email || user.sub)) || '';

        return (
            <>
                <span
                    className={classNames(
                        styles.license_status_chip,
                        authenticated ? styles.license_status_chip_active : null
                    )}
                    role="status"
                >
                    {authenticated ?
                        this.props.intl.formatMessage(messages.web_signed_in, {
                            name: displayName || '—'
                        }) :
                        this.props.intl.formatMessage(messages.web_signed_out)}
                </span>

                {authenticated ? this.renderAccountRights() : null}

                <div className={styles.license_hint}>
                    {this.props.intl.formatMessage(messages.web_account_hint)}
                </div>

                <div className={styles.license_primary_actions}>
                    {authenticated ? (
                        <button
                            type="button"
                            className={classNames(
                                formStyles.action_button,
                                styles.license_primary_button
                            )}
                            onClick={this.onOpenLicensesClick}
                        >
                            {this.props.intl.formatMessage(messages.web_manage_subscription)}
                        </button>
                    ) : (
                        <button
                            type="button"
                            className={classNames(
                                formStyles.action_button,
                                styles.license_primary_button
                            )}
                            onClick={this.onWebSignInClick}
                        >
                            {this.props.intl.formatMessage(messages.web_sign_in)}
                        </button>
                    )}
                </div>

                {this.renderDesktopNote()}
            </>
        );
    }

    renderDesktopNote () {
        return (
            <div className={styles.license_desktop_note}>
                <div className={styles.license_hint}>
                    {this.props.intl.formatMessage(messages.web_desktop_note)}
                </div>
                <button
                    type="button"
                    className={classNames(
                        formStyles.action_button,
                        styles.license_button_secondary
                    )}
                    onClick={this.onDownloadDesktopClick}
                >
                    {this.props.intl.formatMessage(messages.web_download_desktop)}
                </button>
            </div>
        );
    }

    renderInactiveForm () {
        const ld = this.props.license;
        const deviceLinkPending = ld.deviceLinkStatus === 'pending';
        const keyTrimmed = (this.state.licenseKeyDraft || '').trim();

        return (
            <>
                <div className={styles.license_primary_actions}>
                    {!deviceLinkPending ? (
                        <button
                            type="button"
                            className={classNames(
                                formStyles.action_button,
                                styles.license_primary_button
                            )}
                            disabled={ld.isActivating}
                            onClick={this.onRobboIdClick}
                        >
                            {this.props.intl.formatMessage(messages.robbo_id_login)}
                        </button>
                    ) : (
                        <button
                            type="button"
                            className={classNames(
                                formStyles.action_button,
                                styles.license_button_secondary
                            )}
                            onClick={this.onCancelDeviceLinkClick}
                        >
                            {this.props.intl.formatMessage(messages.robbo_id_cancel)}
                        </button>
                    )}
                </div>

                {deviceLinkPending ? (
                    <div className={styles.license_device_link} role="status">
                        <div className={styles.license_user_code}>
                            {ld.deviceLinkUserCode || '—'}
                        </div>
                        <div className={styles.license_hint}>
                            {this.props.intl.formatMessage(messages.device_link_waiting, {
                                code: ld.deviceLinkUserCode || '—'
                            })}
                        </div>
                        {ld.deviceLinkVerificationUri ? (
                            <button
                                type="button"
                                className={classNames(
                                    formStyles.action_button,
                                    styles.license_button_secondary,
                                    styles.license_link_again
                                )}
                                onClick={this.onOpenVerificationAgain}
                            >
                                {this.props.intl.formatMessage(messages.robbo_id_open_again)}
                            </button>
                        ) : null}
                    </div>
                ) : null}

                {!deviceLinkPending ? (
                    <button
                        type="button"
                        className={styles.license_link_button}
                        onClick={this.onToggleKeyForm}
                    >
                        {this.props.intl.formatMessage(
                            this.state.showKeyForm
                                ? messages.hide_key_form
                                : messages.show_key_form
                        )}
                    </button>
                ) : null}

                {this.state.showKeyForm && !deviceLinkPending ? (
                    <>
                        <div className={styles.license_field_row}>
                            <label
                                htmlFor="license-key"
                                className={styles.license_field_label}
                            >
                                {this.props.intl.formatMessage(messages.license_key)}
                            </label>
                            <input
                                id="license-key"
                                type="text"
                                className={styles.license_text_input}
                                autoComplete="off"
                                value={this.state.licenseKeyDraft}
                                onChange={this.handleKeyChange}
                            />
                        </div>
                        <div className={classNames(formStyles.footer, styles.license_actions)}>
                            <div className={formStyles.button_group}>
                                <button
                                    type="button"
                                    className={formStyles.action_button}
                                    disabled={ld.isActivating || !keyTrimmed}
                                    onClick={this.onActivateClick}
                                >
                                    {this.props.intl.formatMessage(messages.activate)}
                                </button>
                            </div>
                        </div>
                    </>
                ) : null}
            </>
        );
    }

    renderActiveCard () {
        const ld = this.props.license;
        const copiedField = this.state[COPY_FEEDBACK_KEY];
        const idRows = [];
        if (ld.licenseId) {
            idRows.push({
                key: 'licenseId',
                label: this.props.intl.formatMessage(messages.meta_license_id),
                value: ld.licenseId,
                shortValue: shortenId(ld.licenseId, 10, 5)
            });
        }
        if (ld.seatId) {
            idRows.push({
                key: 'seatId',
                label: this.props.intl.formatMessage(messages.meta_seat_id),
                value: ld.seatId,
                shortValue: shortenId(ld.seatId, 8, 4)
            });
        }

        return (
            <div className={styles.license_card}>
                <dl className={styles.license_meta_list}>
                    <div className={styles.license_meta_row}>
                        <dt className={styles.license_meta_label}>
                            {this.props.intl.formatMessage(messages.meta_status)}
                        </dt>
                        <dd className={styles.license_meta_value}>
                            {this.props.intl.formatMessage(messages.status_active)}
                        </dd>
                    </div>
                    <div className={styles.license_meta_row}>
                        <dt className={styles.license_meta_label}>
                            {this.props.intl.formatMessage(messages.meta_valid_until)}
                        </dt>
                        <dd className={styles.license_meta_value}>
                            {this.formatExpiresAt(ld.expiresAt)}
                        </dd>
                    </div>
                    {ld.tariff ? (
                        <div className={styles.license_meta_row}>
                            <dt className={styles.license_meta_label}>
                                {this.props.intl.formatMessage(messages.meta_tariff)}
                            </dt>
                            <dd className={styles.license_meta_value}>{ld.tariff}</dd>
                        </div>
                    ) : null}
                    {ld.ownerName ? (
                        <div className={styles.license_meta_row}>
                            <dt className={styles.license_meta_label}>
                                {this.props.intl.formatMessage(messages.meta_owner)}
                            </dt>
                            <dd className={styles.license_meta_value}>{ld.ownerName}</dd>
                        </div>
                    ) : null}
                    {idRows.map(row => {
                        const justCopied = copiedField === row.key;
                        return (
                            <div
                                key={row.key}
                                className={classNames(
                                    styles.license_meta_row,
                                    styles.license_meta_row_id
                                )}
                            >
                                <dt className={styles.license_meta_label}>
                                    {row.label}
                                </dt>
                                <dd className={styles.license_meta_id_cell}>
                                    <code
                                        className={styles.license_meta_id}
                                        title={row.value}
                                    >
                                        {row.shortValue}
                                    </code>
                                    <button
                                        type="button"
                                        className={classNames(styles.license_copy_button, {
                                            [styles.license_copy_button_done]: justCopied
                                        })}
                                        title={this.props.intl.formatMessage(
                                            justCopied ? messages.copied : messages.copy
                                        )}
                                        aria-label={this.props.intl.formatMessage(
                                            justCopied ? messages.copied : messages.copy
                                        )}
                                        onClick={() => this.onCopyId(row.key, row.value)}
                                    >
                                        {justCopied
                                            ? this.props.intl.formatMessage(messages.copied)
                                            : this.props.intl.formatMessage(messages.copy)}
                                    </button>
                                </dd>
                            </div>
                        );
                    })}
                </dl>
                <div className={styles.license_card_footer}>
                    <button
                        type="button"
                        className={classNames(
                            formStyles.action_button,
                            styles.license_account_button
                        )}
                        onClick={this.onOpenAccountClick}
                    >
                        {this.props.intl.formatMessage(messages.open_account)}
                    </button>
                    <button
                        type="button"
                        className={styles.license_deactivate_button}
                        onClick={this.onDeactivateClick}
                    >
                        {this.props.intl.formatMessage(messages.deactivate_license)}
                    </button>
                </div>
            </div>
        );
    }

    renderFeaturesSection () {
        const ld = this.props.license;
        const caps = ld.capabilities || [];

        return (
            <div className={styles.license_features}>
                <button
                    type="button"
                    className={styles.license_features_toggle}
                    aria-expanded={this.state.showFeatures}
                    onClick={this.onToggleFeatures}
                >
                    <span>
                        {this.props.intl.formatMessage(messages.features_toggle)}
                    </span>
                    <span className={styles.license_features_chevron} aria-hidden="true">
                        {this.state.showFeatures ? '▴' : '▾'}
                    </span>
                </button>
                {this.state.showFeatures ? (
                    <ul className={styles.license_features_list}>
                        {LICENSE_FEATURES.map(feature => {
                            const granted = caps.indexOf(feature.capability) >= 0;
                            return (
                                <li
                                    key={feature.capability}
                                    className={styles.license_feature_row}
                                >
                                    <span
                                        className={classNames(styles.license_feature_icon, {
                                            [styles.license_feature_icon_granted]: granted,
                                            [styles.license_feature_icon_locked]: !granted
                                        })}
                                        aria-hidden="true"
                                    />
                                    <div className={styles.license_feature_text}>
                                        <div className={styles.license_feature_title}>
                                            {this.props.intl.formatMessage(feature.titleMessage)}
                                        </div>
                                        <div className={styles.license_feature_description}>
                                            {this.props.intl.formatMessage(
                                                feature.descriptionMessage
                                            )}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : null}
            </div>
        );
    }

    renderDevBlock () {
        const ld = this.props.license;
        const showDev = typeof process !== 'undefined' &&
            process.env &&
            process.env.NODE_ENV !== 'production';
        if (!showDev) {
            return null;
        }

        return (
            <div className={styles.license_dev_block}>
                <div className={styles.license_dev_title}>
                    {this.props.intl.formatMessage(messages.dev_settings)}
                </div>
                <div className={styles.license_field_row}>
                    <label
                        htmlFor="license-activation-base"
                        className={styles.license_field_label}
                    >
                        {this.props.intl.formatMessage(messages.activation_url)}
                    </label>
                    <input
                        id="license-activation-base"
                        type="text"
                        className={styles.license_text_input}
                        value={ld.activationBaseUrl}
                        onChange={this.handleBaseChange}
                    />
                </div>
                <div className={styles.license_hint}>
                    {this.props.intl.formatMessage(messages.hint_dev)}
                </div>
            </div>
        );
    }

    render () {
        const ld = this.props.license;
        const isDesktop = isDesktopWithBluetooth();
        const isActive = ld.status === 'valid_offline';
        const showAddonWarning = Boolean(ld.addonError && isActive && isDesktop);

        return (
            <div
                id="license-window"
                className={classNames(sharedStyles.palette, styles.license_window)}
            >
                <div id="license-window-title" className={sharedStyles.header}>
                    <span className={sharedStyles.headerTitle}>
                        {this.props.intl.formatMessage(messages.title)}
                    </span>
                    <button
                        type="button"
                        className={sharedStyles.closeButton}
                        aria-label={this.props.intl.formatMessage(messages.close)}
                        onClick={this.close}
                    />
                </div>

                <div
                    className={classNames(
                        sharedStyles.body,
                        styles.license_content
                    )}
                >
                    <div className={classNames(formStyles.section, styles.license_section)}>
                        {isDesktop ? (
                            <>
                                {!isActive ? this.renderStatusChip() : null}

                                {this.renderReasonNotice()}

                                {showAddonWarning ? (
                                    <div className={styles.license_addon_warning} role="alert">
                                        {this.props.intl.formatMessage(messages.addon_issue, {
                                            error: ld.addonError
                                        })}
                                    </div>
                                ) : null}

                                {isActive ? this.renderActiveCard() : this.renderInactiveForm()}

                                {this.renderFeaturesSection()}
                                {this.renderDevBlock()}
                            </>
                        ) : (
                            this.renderWebAccountPanel()
                        )}
                    </div>
                </div>
            </div>
        );
    }
}

const mapStateToProps = state => ({
    license: state.scratchGui.license,
    robboAccountSessionStatus: (state.scratchGui.robboAccount || {}).sessionStatus,
    robboAccountUser: (state.scratchGui.robboAccount || {}).user,
    robboAccountEntitlements: (state.scratchGui.robboAccount || {}).entitlements
});

const mapDispatchToProps = dispatch => ({
    onLicenseWindowClose: windowId => {
        dispatch(ActionTriggerNewDraggableWindow(windowId));
    },
    onPersistActivationBase: url => {
        dispatch(persistActivationBaseUrlThunk(url));
    },
    onActivate: key => {
        dispatch(activateLicenseThunk(key));
    },
    onClearLicense: () => {
        dispatch(clearLicenseThunk());
    },
    onStartDeviceLink: () => {
        dispatch(startDeviceLinkThunk());
    },
    onCancelDeviceLink: () => {
        dispatch(cancelDeviceLinkThunk());
    },
    onStartSignIn: () => {
        dispatch(startOidcLoginThunk());
    },
    onRefreshLicense: () => dispatch(refreshLicenseThunk({manual: true})),
    onReleaseLicense: () => dispatch(releaseLicenseThunk())
});

export default injectIntl(
    connect(mapStateToProps, mapDispatchToProps)(LicenseWindowComponent)
);
