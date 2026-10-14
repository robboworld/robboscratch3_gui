import bindAll from 'lodash.bindall';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';
import {connect} from 'react-redux';

import {resolveLkBase} from '../../lib/robbo-account/robboAccountConfig';
import {startOidcLoginThunk} from '../../RobboGui/actions/robboAccountActions';
import ottoConfusedDance from './otto-confused-dance.png';
import styles from './cloud-project-not-found.css';

const messages = defineMessages({
    title: {
        id: 'gui.cloudProjectNotFound.title',
        defaultMessage: 'Whoops!',
        description: 'Heading when a cloud project URL cannot be opened'
    },
    body: {
        id: 'gui.cloudProjectNotFound.body',
        defaultMessage: 'Our Robbo server is scratching its head. We couldn\u2019t find the page you\u2019re looking for. Check to make sure you\u2019ve typed the URL correctly.',
        description: 'Body text when a cloud project URL cannot be opened'
    },
    createProject: {
        id: 'gui.cloudProjectNotFound.createProject',
        defaultMessage: 'Create a new project',
        description: 'Link to open the editor without a project id'
    },
    signIn: {
        id: 'gui.cloudProjectNotFound.signIn',
        defaultMessage: 'Sign in',
        description: 'Sign in link on cloud project not-found page'
    },
    accountHome: {
        id: 'gui.cloudProjectNotFound.accountHome',
        defaultMessage: 'Robbo Account',
        description: 'Link to personal account home'
    }
});

class CloudProjectNotFound extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleCreateProject',
            'handleSignIn'
        ]);
    }
    handleCreateProject () {
        if (typeof window === 'undefined') {
            return;
        }
        const hash = window.location.hash || '';
        window.location.assign(`${window.location.pathname}${hash}`);
    }
    handleSignIn () {
        this.props.onStartSignIn(typeof window !== 'undefined' ? window.location.href : '');
    }
    render () {
        const isRussianLocale = (this.props.intl.locale || '').toLowerCase().indexOf('ru') === 0;
        const logoWordmark = isRussianLocale ? 'РОББО' : 'ROBBO';
        const accountHomeUrl = resolveLkBase();

        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <div className={styles.logoRow}>
                        <span className={styles.logoWordmark} aria-hidden="true">
                            {logoWordmark}
                            <sup className={styles.logoReg}>®</sup>
                        </span>
                    </div>
                    <div className={styles.illustration} aria-hidden="true">
                        <img
                            alt=""
                            className={styles.illustrationImage}
                            src={ottoConfusedDance}
                        />
                    </div>
                    <h1 className={styles.title}>
                        <FormattedMessage {...messages.title} />
                    </h1>
                    <p className={styles.body}>
                        <FormattedMessage {...messages.body} />
                    </p>
                    <div className={styles.actions}>
                        <button
                            className={classNames(styles.button, styles.buttonPrimary)}
                            type="button"
                            onClick={this.handleCreateProject}
                        >
                            <FormattedMessage {...messages.createProject} />
                        </button>
                        {!this.props.isAuthenticated ? (
                            <button
                                className={classNames(styles.button, styles.buttonSecondary)}
                                type="button"
                                onClick={this.handleSignIn}
                            >
                                <FormattedMessage {...messages.signIn} />
                            </button>
                        ) : null}
                        <a
                            className={classNames(styles.button, styles.buttonLink)}
                            href={accountHomeUrl}
                        >
                            <FormattedMessage {...messages.accountHome} />
                        </a>
                    </div>
                </div>
            </div>
        );
    }
}

CloudProjectNotFound.propTypes = {
    intl: intlShape,
    isAuthenticated: PropTypes.bool,
    onStartSignIn: PropTypes.func
};

const mapStateToProps = state => {
    const account = state.scratchGui.robboAccount || {};
    return {
        isAuthenticated: account.sessionStatus === 'authenticated'
    };
};

const mapDispatchToProps = dispatch => ({
    onStartSignIn: returnTo => dispatch(startOidcLoginThunk(returnTo))
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(CloudProjectNotFound));
