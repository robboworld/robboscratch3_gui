import React, {Component} from 'react';
import {connect} from 'react-redux';
import {defineMessages, injectIntl} from 'react-intl';
import classNames from 'classnames';

import sharedStyles from './DevicePaletteShared.css';
import formStyles from './RobboPaletteForm.css';
import styles from './LicenseWindowComponent.css';
import {ActionTriggerNewDraggableWindow} from './actions/sensor_actions';
import {
    activateLicenseDemoThunk,
    persistActivationBaseUrlDemoThunk,
    clearDemoLicenseThunk
} from './actions/licenseDemoActions';
import {CAPABILITY_PREMIUM_AUTO_UPDATE} from './reducers/license_demo';

const messages = defineMessages({
    title: {
        id: 'gui.licenseWindow.title',
        description: 'Demo license window title',
        defaultMessage: 'License (demo)'
    },
    activation_url: {
        id: 'gui.licenseWindow.activation_url',
        defaultMessage: 'Activation server base URL'
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
            '1) In rs3-paid-addon: npm run build. 2) In rs3-activation-mock: npm run sync-addon && npm start. Demo key: DEMO-LICENSE-VALID.'
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
        defaultMessage: '{cap} granted — use «Premium auto-update (demo)» in the Robbo menu.'
    },
    addon_pending: {
        id: 'gui.licenseWindow.addon_pending',
        defaultMessage: 'Fetching paid addon bundle from server…'
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
        this.props.onActivateDemo(this.state.licenseKeyDraft);
    }

    onClearClick () {
        this.setState({licenseKeyDraft: ''});
        this.props.onClearDemoLicense();
    }

    renderStatusLine () {
        const ld = this.props.license_demo;
        if (ld.activationError) {
            return `Error: ${ld.activationError}`;
        }
        if (ld.addonError && ld.status === 'valid_offline') {
            return `Activation OK — addon issue: ${ld.addonError}`;
        }
        if (ld.status === 'valid_offline') {
            const caps = ld.capabilities.join(', ');
            return this.props.intl.formatMessage(messages.status_valid, {
                capabilities: caps || '(none)',
                addon: ld.addonReady ? 'yes' : 'pending'
            });
        }
        return this.props.intl.formatMessage(messages.status_inactive);
    }

    render () {
        const ld = this.props.license_demo;
        const hasPremium =
            ld.status === 'valid_offline' &&
            ld.capabilities.indexOf(CAPABILITY_PREMIUM_AUTO_UPDATE) >= 0;
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
                        <div className={styles.license_field_row}>
                            <label
                                htmlFor="license-demo-activation-base"
                                className={styles.license_field_label}
                            >
                                {this.props.intl.formatMessage(messages.activation_url)}
                            </label>
                            <input
                                id="license-demo-activation-base"
                                type="text"
                                className={styles.license_text_input}
                                value={ld.activationBaseUrl}
                                onChange={this.handleBaseChange}
                            />
                        </div>

                        <div className={styles.license_field_row}>
                            <label
                                htmlFor="license-demo-key"
                                className={styles.license_field_label}
                            >
                                {this.props.intl.formatMessage(messages.license_key)}
                            </label>
                            <input
                                id="license-demo-key"
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
                                    disabled={ld.isActivating}
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
                    </div>
                </div>
            </div>
        );
    }
}

const mapStateToProps = state => ({
    license_demo: state.scratchGui.license_demo
});

const mapDispatchToProps = dispatch => ({
    onLicenseWindowClose: windowId => {
        dispatch(ActionTriggerNewDraggableWindow(windowId));
    },
    onPersistActivationBase: url => {
        dispatch(persistActivationBaseUrlDemoThunk(url));
    },
    onActivateDemo: key => {
        dispatch(activateLicenseDemoThunk(key));
    },
    onClearDemoLicense: () => {
        dispatch(clearDemoLicenseThunk());
    }
});

export default injectIntl(
    connect(mapStateToProps, mapDispatchToProps)(LicenseWindowComponent)
);
