import bindAll from 'lodash.bindall';
import omit from 'lodash.omit';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {defineMessages, injectIntl, intlShape} from 'react-intl';

import log from './log';
import {
    isNwRuntime,
    readProjectFromAbsolutePath
} from './nw-open-project-utils';
import {
    LoadingState,
    LoadingStates,
    onLoadedProject,
    requestProjectUpload as requestProjectUploadAction
} from '../reducers/project-state';
import {openLoadingProject, closeLoadingProject} from '../reducers/modals';
import {closeFileMenu} from '../reducers/menus';
import {setProjectTitle} from '../reducers/project-title';

const messages = defineMessages({
    loadError: {
        id: 'gui.projectLoader.loadError',
        defaultMessage: 'The project file that was selected failed to load.',
        description: 'An error that displays when a local project file fails to load.'
    }
});

const NW_CLI_PROP_KEYS = [
    'dispatchProjectUpload',
    'intl',
    'loadingState',
    'onNwLoadFinished',
    'onUpdateProjectTitle',
    'openLoadingProject'
];

/*
 * NW.js: load project from CLI argv or second-instance open (file association). Pass-through HOC.
 * @param {React.Component} WrappedComponent inner GUI component
 * @returns {React.Component} connected wrapper
 */
const nwCliProjectOpenerHOC = function (WrappedComponent) {
    class NwCliProjectOpenerComponent extends React.Component {
        constructor (props) {
            super(props);
            bindAll(this, [
                'tryConsumePending',
                'handleNwOpenEvent'
            ]);
            this._nwRetryTimer = null;
            this._nwRetryCount = 0;
        }
        componentDidMount () {
            if (typeof window !== 'undefined') {
                window.addEventListener('robboNwOpenProject', this.handleNwOpenEvent);
            }
            this.tryConsumePending();
        }
        componentDidUpdate (prevProps) {
            if (!window.__ROBBO_NW_PENDING_PROJECT__) {
                return;
            }
            if (this._canAcceptFileLoad(this.props.loadingState) &&
                !this._canAcceptFileLoad(prevProps.loadingState)) {
                this.tryConsumePending();
            }
        }
        componentWillUnmount () {
            if (typeof window !== 'undefined') {
                window.removeEventListener('robboNwOpenProject', this.handleNwOpenEvent);
            }
            if (this._nwRetryTimer) {
                clearTimeout(this._nwRetryTimer);
            }
        }
        handleNwOpenEvent (ev) {
            if (!isNwRuntime()) {
                return;
            }
            const p = ev.detail && ev.detail.path;
            if (!p) {
                return;
            }
            try {
                const read = readProjectFromAbsolutePath(p);
                if (!read) {
                    return;
                }
                window.__ROBBO_NW_PENDING_PROJECT__ = read;
                this._nwRetryCount = 0;
                this.tryConsumePending();
            } catch (e) {
                log.warn(e);
            }
        }
        _canAcceptFileLoad (loadingState) {
            return loadingState === LoadingState.NOT_LOADED ||
                loadingState === LoadingState.SHOWING_WITHOUT_ID ||
                loadingState === LoadingState.SHOWING_WITH_ID;
        }
        _scheduleRetry () {
            if (this._nwRetryCount > 60) {
                delete window.__ROBBO_NW_PENDING_PROJECT__;
                return;
            }
            this._nwRetryCount++;
            this._nwRetryTimer = setTimeout(() => {
                this._nwRetryTimer = null;
                this.tryConsumePending();
            }, 150);
        }
        tryConsumePending () {
            if (!isNwRuntime() || !this.props.vm) {
                return;
            }
            const pending = window.__ROBBO_NW_PENDING_PROJECT__;
            if (!pending) {
                return;
            }
            if (!this._canAcceptFileLoad(this.props.loadingState)) {
                this._scheduleRetry();
                return;
            }
            const before = this.props.loadingState;
            const action = requestProjectUploadAction(before);
            if (!action) {
                this._scheduleRetry();
                return;
            }
            const {data, title} = pending;
            window.__ROBBO_NW_LOADING_PROJECT__ = true;
            this.props.dispatchProjectUpload(action);
            delete window.__ROBBO_NW_PENDING_PROJECT__;
            this._nwRetryCount = 0;
            this.props.openLoadingProject();
            setTimeout(() => {
                this.props.vm.loadProject(data)
                    .then(() => {
                        if (title) {
                            this.props.onUpdateProjectTitle(title);
                            document.title = title;
                        }
                        history.replaceState({}, document.title, '.');
                        this.props.onNwLoadFinished(LoadingState.LOADING_VM_FILE_UPLOAD, true);
                        window.__ROBBO_NW_LOADING_PROJECT__ = false;
                    })
                    .catch(err => {
                        log.warn(err);
                        alert(this.props.intl.formatMessage(messages.loadError)); // eslint-disable-line no-alert
                        this.props.onNwLoadFinished(LoadingState.LOADING_VM_FILE_UPLOAD, false);
                        window.__ROBBO_NW_LOADING_PROJECT__ = false;
                    });
            }, 0);
        }
        render () {
            return (
                <WrappedComponent
                    {...omit(this.props, NW_CLI_PROP_KEYS)}
                />
            );
        }
    }

    NwCliProjectOpenerComponent.propTypes = {
        dispatchProjectUpload: PropTypes.func,
        intl: intlShape.isRequired,
        loadingState: PropTypes.oneOf(LoadingStates).isRequired,
        onNwLoadFinished: PropTypes.func,
        onUpdateProjectTitle: PropTypes.func,
        openLoadingProject: PropTypes.func,
        vm: PropTypes.shape({
            loadProject: PropTypes.func
        })
    };

    const mapStateToProps = state => ({
        loadingState: state.scratchGui.projectState.loadingState,
        vm: state.scratchGui.vm
    });

    const mapDispatchToProps = (dispatch, ownProps) => ({
        dispatchProjectUpload: action => dispatch(action),
        openLoadingProject: () => dispatch(openLoadingProject()),
        onNwLoadFinished: (loadingState, success) => {
            dispatch(onLoadedProject(loadingState, ownProps.canSave, success));
            dispatch(closeLoadingProject());
            dispatch(closeFileMenu());
        },
        onUpdateProjectTitle: title => dispatch(setProjectTitle(title))
    });

    const mergeProps = (stateProps, dispatchProps, ownProps) =>
        Object.assign({}, ownProps, dispatchProps, stateProps);

    return connect(
        mapStateToProps,
        mapDispatchToProps,
        mergeProps
    )(injectIntl(NwCliProjectOpenerComponent));
};

export default nwCliProjectOpenerHOC;
