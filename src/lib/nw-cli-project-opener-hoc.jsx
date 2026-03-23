import bindAll from 'lodash.bindall';
import omit from 'lodash.omit';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {defineMessages, injectIntl, intlShape} from 'react-intl';

import log from './log';
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

const nwRuntime = () => typeof process !== 'undefined' && process.versions &&
    (process.versions.nw || process.versions['node-webkit']);

const normalizeNwPath = rawPath => {
    if (!rawPath || typeof rawPath !== 'string') {
        return null;
    }
    let normalized = rawPath.trim();
    if (!normalized) {
        return null;
    }
    if ((normalized[0] === '"' && normalized[normalized.length - 1] === '"') ||
        (normalized[0] === '\'' && normalized[normalized.length - 1] === '\'')) {
        normalized = normalized.slice(1, -1).trim();
    }
    if (/^file:\/\//i.test(normalized)) {
        try {
            normalized = decodeURIComponent(normalized.replace(/^file:\/\/\/?/i, ''));
            if (/^\/[A-Za-z]:\//.test(normalized)) {
                normalized = normalized.slice(1);
            }
        } catch (e) {
            return null;
        }
    }
    if (/^[A-Za-z]:\//.test(normalized)) {
        normalized = normalized.replace(/\//g, '\\');
    }
    return normalized;
};

const readProjectFromAbsolutePath = function (absPath) {
    const normalizedPath = normalizeNwPath(absPath);
    if (!normalizedPath) {
        return null;
    }
    const nwPath = window.nw.require('path');
    const fs = window.nw.require('fs');
    const ext = nwPath.extname(normalizedPath).toLowerCase();
    if (ext !== '.sb3' && ext !== '.sb2' && ext !== '.sb') {
        return null;
    }
    const buf = fs.readFileSync(normalizedPath);
    const data = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    return {
        data,
        title: nwPath.basename(normalizedPath, ext)
    };
};

const debugNwOpen = (stage, payload) => {
    try {
        if (typeof window !== 'undefined' && typeof window.__ROBBO_NW_DEBUG_LOG__ === 'function') {
            window.__ROBBO_NW_DEBUG_LOG__(`hoc:${stage}`, payload || {});
        }
    } catch (e) {
        // no-op
    }
};

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
            debugNwOpen('componentDidMount', {hasVm: !!this.props.vm, loadingState: this.props.loadingState});
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
            if (!nwRuntime()) {
                return;
            }
            const p = ev.detail && ev.detail.path;
            debugNwOpen('handleNwOpenEvent:received', {rawPath: p, hasVm: !!this.props.vm});
            if (!p) {
                return;
            }
            try {
                const read = readProjectFromAbsolutePath(p);
                if (!read) {
                    debugNwOpen('handleNwOpenEvent:read-null', {rawPath: p});
                    return;
                }
                window.__ROBBO_NW_PENDING_PROJECT__ = read;
                debugNwOpen('handleNwOpenEvent:pending-set', {title: read.title, bytes: read.data && read.data.byteLength});
                this._nwRetryCount = 0;
                this.tryConsumePending();
            } catch (e) {
                log.warn(e);
                debugNwOpen('handleNwOpenEvent:error', {message: e && e.message});
            }
        }
        _canAcceptFileLoad (loadingState) {
            return loadingState === LoadingState.NOT_LOADED ||
                loadingState === LoadingState.SHOWING_WITHOUT_ID ||
                loadingState === LoadingState.SHOWING_WITH_ID;
        }
        _scheduleRetry () {
            if (this._nwRetryCount > 60) {
                debugNwOpen('scheduleRetry:drop-pending', {retryCount: this._nwRetryCount});
                delete window.__ROBBO_NW_PENDING_PROJECT__;
                return;
            }
            this._nwRetryCount++;
            debugNwOpen('scheduleRetry', {retryCount: this._nwRetryCount, loadingState: this.props.loadingState});
            this._nwRetryTimer = setTimeout(() => {
                this._nwRetryTimer = null;
                this.tryConsumePending();
            }, 150);
        }
        tryConsumePending () {
            if (!nwRuntime() || !this.props.vm) {
                debugNwOpen('tryConsumePending:no-runtime-or-vm', {hasVm: !!this.props.vm});
                return;
            }
            const pending = window.__ROBBO_NW_PENDING_PROJECT__;
            if (!pending) {
                debugNwOpen('tryConsumePending:no-pending', {});
                return;
            }
            debugNwOpen('tryConsumePending:start', {
                loadingState: this.props.loadingState,
                canAccept: this._canAcceptFileLoad(this.props.loadingState),
                title: pending.title,
                bytes: pending.data && pending.data.byteLength
            });
            if (!this._canAcceptFileLoad(this.props.loadingState)) {
                this._scheduleRetry();
                return;
            }
            const before = this.props.loadingState;
            const action = requestProjectUploadAction(before);
            if (!action) {
                debugNwOpen('tryConsumePending:no-action', {loadingState: before});
                this._scheduleRetry();
                return;
            }
            this.props.dispatchProjectUpload(action);
            delete window.__ROBBO_NW_PENDING_PROJECT__;
            this._nwRetryCount = 0;
            const {data, title} = pending;
            this.props.openLoadingProject();
            window.__ROBBO_NW_LOADING_PROJECT__ = true;
            setTimeout(() => {
                debugNwOpen('vm.loadProject:begin', {title, bytes: data && data.byteLength});
                this.props.vm.loadProject(data)
                    .then(() => {
                        debugNwOpen('vm.loadProject:success', {title});
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
                        debugNwOpen('vm.loadProject:error', {message: err && err.message});
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
