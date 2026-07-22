import React, {Component} from 'react';
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
    cancelDeviceLinkThunk
} from './actions/licenseActions';
import {LICENSE_FEATURES} from '../lib/licensing/licenseFeatures';
import {openExternalUrl} from '../lib/platform.js';
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
        defaultMessage: 'Deactivate license'
    },
    deactivate_confirm: {
        id: 'gui.licenseWindow.deactivate_confirm',
        defaultMessage:
            'Remove the license from this device? You can activate it again later.'
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
        this.onRobboIdClick = this.onRobboIdClick.bind(this);
        this.onCancelDeviceLinkClick = this.onCancelDeviceLinkClick.bind(this);
        this.onOpenVerificationAgain = this.onOpenVerificationAgain.bind(this);
        this.onToggleKeyForm = this.onToggleKeyForm.bind(this);
        this.onToggleFeatures = this.onToggleFeatures.bind(this);
        this.onCopyId = this.onCopyId.bind(this);
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
        const confirmed = window.confirm(
            this.props.intl.formatMessage(messages.deactivate_confirm)
        );
        if (!confirmed) {
            return;
        }
        this.setState({licenseKeyDraft: '', showKeyForm: false});
        this.props.onClearLicense();
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
        return (
            <span
                className={styles.license_status_chip}
                role="status"
            >
                {this.props.intl.formatMessage(messages.status_inactive)}
            </span>
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
        const isActive = ld.status === 'valid_offline';
        const showAddonWarning = Boolean(ld.addonError && isActive);

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
                        aria-label="Close"
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
                        {!isActive ? this.renderStatusChip() : null}

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
                    </div>
                </div>
            </div>
        );
    }
}

const mapStateToProps = state => ({
    license: state.scratchGui.license
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
    }
});

export default injectIntl(
    connect(mapStateToProps, mapDispatchToProps)(LicenseWindowComponent)
);
