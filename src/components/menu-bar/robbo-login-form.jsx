import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {defineMessages, injectIntl, intlShape} from 'react-intl';

import {signInWithPasswordThunk} from '../../RobboGui/actions/robboAccountActions';
import {loginUrl} from '../../lib/robbo-account/robboAccountConfig';
import {LoginDropdownMessages} from './login-dropdown.jsx';

import styles from './robbo-login-form.css';

const formMessages = defineMessages({
    errorBadCredentials: {
        id: 'gui.menuBar.robboLoginBadCredentials',
        defaultMessage: 'Incorrect email or password.',
        description: 'Inline login error for 401/404'
    },
    errorDisabled: {
        id: 'gui.menuBar.robboLoginDisabled',
        defaultMessage: 'This account is disabled.',
        description: 'Inline login error for 403'
    },
    errorPasswordDisabled: {
        id: 'gui.menuBar.robboLoginPasswordDisabled',
        defaultMessage: 'Password sign-in is disabled. Use the account website.',
        description: 'Inline login error for 410'
    },
    errorGeneric: {
        id: 'gui.menuBar.robboLoginGenericError',
        defaultMessage: 'Sign in failed. Try again.',
        description: 'Inline login error for other failures'
    },
    ssoOnlyHint: {
        id: 'gui.menuBar.robboLoginSsoOnly',
        defaultMessage: 'Password sign-in is not available. Continue on the account website.',
        description: 'Shown when lmsPasswordFallback is false'
    },
    openAccountLogin: {
        id: 'gui.menuBar.robboOpenAccountLogin',
        defaultMessage: 'Open account login',
        description: 'Button to open full LK login in a new tab'
    }
});

class RobboLoginForm extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            email: '',
            password: '',
            submitting: false,
            errorStatus: null
        };
        this.handleChangeEmail = this.handleChangeEmail.bind(this);
        this.handleChangePassword = this.handleChangePassword.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleOpenLkLogin = this.handleOpenLkLogin.bind(this);
        this.handleNeedHelp = this.handleNeedHelp.bind(this);
    }
    handleChangeEmail (event) {
        this.setState({email: event.target.value, errorStatus: null});
    }
    handleChangePassword (event) {
        this.setState({password: event.target.value, errorStatus: null});
    }
    handleOpenLkLogin () {
        if (typeof window !== 'undefined') {
            window.open(loginUrl(), '_blank', 'noopener,noreferrer');
        }
    }
    handleNeedHelp (event) {
        event.preventDefault();
        this.handleOpenLkLogin();
    }
    handleSubmit (event) {
        event.preventDefault();
        if (this.state.submitting) {
            return;
        }
        const email = (this.state.email || '').trim();
        const password = this.state.password || '';
        if (!email || !password) {
            this.setState({errorStatus: 400});
            return;
        }
        this.setState({submitting: true, errorStatus: null});
        Promise.resolve(this.props.onSignIn(email, password))
            .then(result => {
                if (result && result.ok) {
                    if (this.props.onClose) {
                        this.props.onClose();
                    }
                    return;
                }
                this.setState({
                    submitting: false,
                    errorStatus: (result && result.status) || 500
                });
            })
            .catch(() => {
                this.setState({submitting: false, errorStatus: 500});
            });
    }
    errorMessage () {
        const {intl} = this.props;
        const status = this.state.errorStatus;
        if (!status) {
            return null;
        }
        if (status === 400) {
            return intl.formatMessage(LoginDropdownMessages.validationRequired);
        }
        if (status === 401 || status === 404) {
            return intl.formatMessage(formMessages.errorBadCredentials);
        }
        if (status === 403) {
            return intl.formatMessage(formMessages.errorDisabled);
        }
        if (status === 410) {
            return intl.formatMessage(formMessages.errorPasswordDisabled);
        }
        return intl.formatMessage(formMessages.errorGeneric);
    }
    renderSsoOnly () {
        const {intl} = this.props;
        return (
            <div className={styles.form}>
                <p className={styles.ssoHint}>
                    {intl.formatMessage(formMessages.ssoOnlyHint)}
                </p>
                <button
                    className={styles.ssoButton}
                    type="button"
                    onClick={this.handleOpenLkLogin}
                >
                    {intl.formatMessage(formMessages.openAccountLogin)}
                </button>
            </div>
        );
    }
    renderForm () {
        const {intl} = this.props;
        const errorText = this.errorMessage();
        return (
            <form
                className={styles.form}
                onSubmit={this.handleSubmit}
            >
                <div>
                    <label className={styles.label}>
                        {intl.formatMessage(LoginDropdownMessages.username)}
                    </label>
                    <input
                        autoComplete="username"
                        className={styles.field}
                        disabled={this.state.submitting}
                        name="email"
                        type="text"
                        value={this.state.email}
                        onChange={this.handleChangeEmail}
                    />
                </div>
                <div>
                    <label className={styles.label}>
                        {intl.formatMessage(LoginDropdownMessages.password)}
                    </label>
                    <input
                        autoComplete="current-password"
                        className={styles.field}
                        disabled={this.state.submitting}
                        name="password"
                        type="password"
                        value={this.state.password}
                        onChange={this.handleChangePassword}
                    />
                </div>
                {errorText ? (
                    <p className={styles.error}>{errorText}</p>
                ) : null}
                <div className={styles.actions}>
                    <button
                        className={styles.submit}
                        disabled={this.state.submitting}
                        type="submit"
                    >
                        {intl.formatMessage(LoginDropdownMessages.signin)}
                    </button>
                    <button
                        className={styles.help}
                        type="button"
                        onClick={this.handleNeedHelp}
                    >
                        {intl.formatMessage(LoginDropdownMessages.needhelp)}
                    </button>
                </div>
            </form>
        );
    }
    render () {
        if (this.props.lmsPasswordFallback === false) {
            return this.renderSsoOnly();
        }
        return this.renderForm();
    }
}

RobboLoginForm.propTypes = {
    intl: intlShape.isRequired,
    lmsPasswordFallback: PropTypes.bool,
    onClose: PropTypes.func,
    onSignIn: PropTypes.func.isRequired
};

const mapStateToProps = state => {
    const account = state.scratchGui.robboAccount || {};
    return {
        lmsPasswordFallback: account.lmsPasswordFallback !== false
    };
};

const mapDispatchToProps = dispatch => ({
    onSignIn: (email, password) => dispatch(signInWithPasswordThunk(email, password))
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(RobboLoginForm));
