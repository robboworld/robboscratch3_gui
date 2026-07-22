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
import {CAPABILITY_PREMIUM_AUTO_UPDATE} from './reducers/license';
import {hasPremiumAutoUpdateCapability} from '../lib/licensing/capabilityGateway';
import {openExternalUrl} from '../lib/platform.js';

const messages = defineMessages({
    title: {
        id: 'gui.licenseWindow.title',
        description: 'License window title',
        defaultMessage: 'License'
    },
    section_in_development: {
        id: 'gui.licenseWindow.section_in_development',
        description: 'License window under development notice',
        defaultMessage: 'In development'
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
    device_link_hint: {
        id: 'gui.licenseWindow.device_link_hint',
        defaultMessage:
            'Sign in with Robbo ID to activate your license without typing a key. Manual key entry remains available below.'
    },
    license_key: {
        id: 'gui.licenseWindow.license_key',
        defaultMessage: 'License key'
    },
    activate: {
        id: 'gui.licenseWindow.activate',
        defaultMessage: 'Activate'
    },
    clear_license: {
        id: 'gui.licenseWindow.clear_license',
        defaultMessage: 'Clear license'
    },
    hint: {
        id: 'gui.licenseWindow.hint',
        defaultMessage:
            'Enter your license key and click Activate. Contact support if you need help.'
    },
    hint_dev: {
        id: 'gui.licenseWindow.hint_dev',
        defaultMessage:
            'Dev: use local ЛК (http://localhost:8080). Sign in with Robbo ID, or activate with a key from «My licenses».'
    },
    status_valid: {
        id: 'gui.licenseWindow.status_valid',
        defaultMessage: 'License OK. Premium capabilities: {capabilities}. Addon loaded: {addon}.'
    },
    status_inactive: {
        id: 'gui.licenseWindow.status_inactive',
        defaultMessage: 'No offline license loaded.'
    },
    premium_autoupgrade_ready: {
        id: 'gui.licenseWindow.premium_ready',
        defaultMessage: '{cap} granted — use «Check for updates» in the About window.'
    },
    addon_pending: {
        id: 'gui.licenseWindow.addon_pending',
        defaultMessage: 'Fetching paid addon bundle from server…'
    },
    status_error: {
        id: 'gui.licenseWindow.status_error',
        defaultMessage: 'Error: {message}'
    },
    status_addon_issue: {
        id: 'gui.licenseWindow.status_addon_issue',
        defaultMessage: 'Activation OK — addon issue: {error}'
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
    capabilities_none: {
        id: 'gui.licenseWindow.capabilities_none',
        defaultMessage: '(none)'
    },
    addon_yes: {
        id: 'gui.licenseWindow.addon_yes',
        defaultMessage: 'yes'
    },
    addon_pending_short: {
        id: 'gui.licenseWindow.addon_pending_short',
        defaultMessage: 'pending'
    }
});

class LicenseWindowComponent extends Component {
    constructor (props) {
        super(props);
        this.state = {licenseKeyDraft: ''};
        this.handleBaseChange = this.handleBaseChange.bind(this);
        this.handleKeyChange = this.handleKeyChange.bind(this);
        this.onActivateClick = this.onActivateClick.bind(this);
        this.onClearClick = this.onClearClick.bind(this);
        this.onRobboIdClick = this.onRobboIdClick.bind(this);
        this.onCancelDeviceLinkClick = this.onCancelDeviceLinkClick.bind(this);
        this.onOpenVerificationAgain = this.onOpenVerificationAgain.bind(this);
        this.close = this.close.bind(this);
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
        this.props.onActivate(this.state.licenseKeyDraft);
    }

    onClearClick () {
        this.setState({licenseKeyDraft: ''});
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

    resolveActivationError (code) {
        if (code === 'empty_license_key') {
            return this.props.intl.formatMessage(messages.error_empty_license_key);
        }
        if (code === 'capability_denied') {
            return this.props.intl.formatMessage(messages.error_capability_denied);
        }
        if (code === 'device_link_expired') {
            return this.props.intl.formatMessage(messages.error_device_link_expired);
        }
        if (code === 'empty_activation_base') {
            return this.props.intl.formatMessage(messages.error_empty_activation_base);
        }
        return code;
    }

    renderStatusLine () {
        const ld = this.props.license;
        if (ld.activationError) {
            return this.props.intl.formatMessage(messages.status_error, {
                message: this.resolveActivationError(ld.activationError)
            });
        }
        if (ld.addonError && ld.status === 'valid_offline') {
            return this.props.intl.formatMessage(messages.status_addon_issue, {
                error: ld.addonError
            });
        }
        if (ld.status === 'valid_offline') {
            const caps = ld.capabilities.join(', ') ||
                this.props.intl.formatMessage(messages.capabilities_none);
            return this.props.intl.formatMessage(messages.status_valid, {
                capabilities: caps,
                addon: ld.addonReady
                    ? this.props.intl.formatMessage(messages.addon_yes)
                    : this.props.intl.formatMessage(messages.addon_pending_short)
            });
        }
        return this.props.intl.formatMessage(messages.status_inactive);
    }

    render () {
        const ld = this.props.license;
        const hasPremium = hasPremiumAutoUpdateCapability(ld);
        const premiumHint =
            hasPremium && ld.addonReady
                ? this.props.intl.formatMessage(messages.premium_autoupgrade_ready, {
                    cap: CAPABILITY_PREMIUM_AUTO_UPDATE
                  })
                : hasPremium && !ld.addonReady
                    ? this.props.intl.formatMessage(messages.addon_pending)
                    : '';
        const statusIsError = Boolean(ld.activationError) ||
            Boolean(ld.addonError && ld.status === 'valid_offline');
        const showDevHint = typeof process !== 'undefined' &&
            process.env &&
            process.env.NODE_ENV !== 'production';
        const deviceLinkPending = ld.deviceLinkStatus === 'pending';

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
                    <div
                        id="license-window-dev-notice"
                        className={styles.license_dev_notice}
                        role="status"
                    >
                        {this.props.intl.formatMessage(messages.section_in_development)}
                    </div>

                    <div className={classNames(formStyles.section, styles.license_section)}>
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

                        <div className={classNames(formStyles.footer, styles.license_actions)}>
                            <div className={formStyles.button_group}>
                                {!deviceLinkPending ? (
                                    <button
                                        type="button"
                                        className={formStyles.action_button}
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
                        ) : (
                            <div className={styles.license_hint}>
                                {this.props.intl.formatMessage(messages.device_link_hint)}
                            </div>
                        )}

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
                                disabled={deviceLinkPending}
                            />
                        </div>

                        <div className={classNames(formStyles.footer, styles.license_actions)}>
                            <div className={formStyles.button_group}>
                                <button
                                    type="button"
                                    className={formStyles.action_button}
                                    disabled={ld.isActivating || deviceLinkPending}
                                    onClick={this.onActivateClick}
                                >
                                    {this.props.intl.formatMessage(messages.activate)}
                                </button>
                                <button
                                    type="button"
                                    className={classNames(
                                        formStyles.action_button,
                                        styles.license_button_secondary
                                    )}
                                    onClick={this.onClearClick}
                                >
                                    {this.props.intl.formatMessage(messages.clear_license)}
                                </button>
                            </div>
                        </div>

                        <div
                            className={classNames(styles.license_status, {
                                [styles.license_status_error]: statusIsError
                            })}
                        >
                            {this.renderStatusLine()}
                        </div>

                        {premiumHint ? (
                            <div className={styles.license_hint}>{premiumHint}</div>
                        ) : null}

                        <div className={styles.license_hint}>
                            {this.props.intl.formatMessage(messages.hint)}
                        </div>

                        {showDevHint ? (
                            <div className={styles.license_hint}>
                                {this.props.intl.formatMessage(messages.hint_dev)}
                            </div>
                        ) : null}
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
