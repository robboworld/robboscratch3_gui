import bindAll from 'lodash.bindall';
import omit from 'lodash.omit';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import queryString from 'query-string';

import log from './log';
import {
    downloadProjectSb3,
    extractPlayToken,
    getProjectPage,
    isCloudProjectMissingError,
    isCloudProjectUnavailableError
} from './robbo-account/robboAccountClient';
import {canonicalizeLoopbackEditorHost} from './robbo-account/robboAccountConfig';
import {
    checkSessionThunk,
    setCloudProjectAccessBlocked,
    setCloudProjectPageId
} from '../RobboGui/actions/robboAccountActions';
import {setProjectUnchanged} from '../reducers/project-changed';
import {
    LoadingState,
    LoadingStates,
    onLoadedProject,
    requestProjectUpload as requestProjectUploadAction
} from '../reducers/project-state';
import {openLoadingProject, closeLoadingProject} from '../reducers/modals';
import {setProjectTitle} from '../reducers/project-title';

const UUID_RE = /^[0-9a-fA-F-]{36}$/;
const SESSION_READY = {
    authenticated: true,
    anonymous: true,
    error: true
};

const CLOUD_LOADER_PROP_KEYS = [
    'cloudProjectPageId',
    'dispatchCheckSession',
    'dispatchProjectUpload',
    'loadingState',
    'onCloudLoadFinished',
    'onCloudProjectAccessBlocked',
    'onCloudProjectAccessUnblocked',
    'onSetCloudProjectPageId',
    'onSetProjectUnchanged',
    'onUpdateProjectTitle',
    'openLoadingProject',
    'closeLoadingProject',
    'sessionStatus'
];

/**
 * Full editor: load .sb3 from ЛК by ?projectPageId=<uuid>.
 * Mirrors nwCliProjectOpenerHOC file-upload loading state machine.
 * @param {React.Component} WrappedComponent
 * @returns {React.Component}
 */
const robboCloudProjectLoaderHOC = function (WrappedComponent) {
    class RobboCloudProjectLoaderComponent extends React.Component {
        constructor (props) {
            super(props);
            bindAll(this, [
                'tryLoadCloudProject',
                'parseProjectPageId',
                '_releaseLoader'
            ]);
            this._started = false;
            this._loadedId = '';
            this._pendingId = '';
            this._retryTimer = null;
            this._retryCount = 0;
            this._holdingLoader = false;
            this._urlIdAtMount = '';
            this._shouldLoadFromUrl = false;
        }
        componentDidMount () {
            if (canonicalizeLoopbackEditorHost()) {
                return;
            }
            this._urlIdAtMount = this.parseProjectPageId();
            this._shouldLoadFromUrl = Boolean(this._urlIdAtMount);
            // Keep the overlay up until session + cloud load finish so the
            // default project cannot paint, then get covered for ~0.2s.
            this.props.openLoadingProject();
            this._holdingLoader = true;
            const sessionPromise = this.props.dispatchCheckSession ?
                this.props.dispatchCheckSession() :
                Promise.resolve();
            sessionPromise
                .then(() => {
                    if (this._shouldLoadFromUrl) {
                        this.tryLoadCloudProject();
                        return;
                    }
                    this._releaseLoader();
                })
                .catch(() => {
                    this._releaseLoader();
                });
        }
        componentDidUpdate (prevProps) {
            if (this.props.sessionStatus === 'authenticated' &&
                prevProps.sessionStatus !== 'authenticated') {
                const urlId = this.parseProjectPageId();
                // Last-project open writes projectPageId into the URL; do not
                // treat that as a second cloud load. Same for an in-flight URL load.
                if (!this._shouldLoadFromUrl ||
                    (urlId && (this._loadedId === urlId || this._pendingId === urlId))) {
                    return;
                }
                this._started = false;
                this._loadedId = '';
                this._pendingId = '';
                this._retryCount = 0;
                if (this.props.onCloudProjectAccessUnblocked) {
                    this.props.onCloudProjectAccessUnblocked();
                }
                this.tryLoadCloudProject();
                return;
            }
            if (this._started) {
                return;
            }
            if (!this._shouldLoadFromUrl) {
                return;
            }
            if (this._canAcceptFileLoad(this.props.loadingState) &&
                !this._canAcceptFileLoad(prevProps.loadingState)) {
                this.tryLoadCloudProject();
            }
            if (SESSION_READY[this.props.sessionStatus] &&
                !SESSION_READY[prevProps.sessionStatus]) {
                this.tryLoadCloudProject();
            }
        }
        componentWillUnmount () {
            if (this._retryTimer) {
                clearTimeout(this._retryTimer);
            }
        }
        _releaseLoader () {
            if (!this._holdingLoader) {
                return;
            }
            this._holdingLoader = false;
            if (this.props.closeLoadingProject) {
                this.props.closeLoadingProject();
            }
        }
        parseProjectPageId () {
            if (typeof window === 'undefined') {
                return '';
            }
            const q = queryString.parse(window.location.search);
            const id = (q.projectPageId || q.projectRef || '').trim();
            if (!id || !UUID_RE.test(id)) {
                return '';
            }
            return id;
        }
        _canAcceptFileLoad (loadingState) {
            return loadingState === LoadingState.NOT_LOADED ||
                loadingState === LoadingState.SHOWING_WITHOUT_ID ||
                loadingState === LoadingState.SHOWING_WITH_ID;
        }
        _scheduleRetry () {
            if (this._retryCount > 60) {
                this._releaseLoader();
                return;
            }
            this._retryCount++;
            this._retryTimer = setTimeout(() => {
                this._retryTimer = null;
                this.tryLoadCloudProject();
            }, 150);
        }
        tryLoadCloudProject () {
            if (this._started || !this.props.vm) {
                return;
            }
            const projectPageId = this._shouldLoadFromUrl ?
                this._urlIdAtMount :
                this.parseProjectPageId();
            if (!projectPageId) {
                return;
            }
            if (!this._shouldLoadFromUrl) {
                this._started = true;
                this._loadedId = projectPageId;
                this._releaseLoader();
                return;
            }
            if (this._loadedId === projectPageId) {
                this._started = true;
                this._releaseLoader();
                return;
            }
            if (!SESSION_READY[this.props.sessionStatus]) {
                this._scheduleRetry();
                return;
            }
            if (!this._canAcceptFileLoad(this.props.loadingState)) {
                this._scheduleRetry();
                return;
            }

            const authenticated = this.props.sessionStatus === 'authenticated';
            this._started = true;
            this._pendingId = projectPageId;

            // Resolve access before touching the VM. A new unpublished card has no
            // .sb3 yet — keep the current editor contents and only bind the cloud id.
            getProjectPage(projectPageId)
                .then(resp => {
                    const page = resp && resp.projectPage;
                    const title = (page && page.title) || '';
                    const playToken = extractPlayToken(resp && resp.playToken);
                    const sb3Promise = authenticated ?
                        downloadProjectSb3(projectPageId) :
                        (playToken ?
                            downloadProjectSb3(projectPageId, {playToken}) :
                            Promise.resolve(null));

                    return sb3Promise
                        .then(buffer => ({ok: Boolean(buffer), buffer, title}))
                        .catch(err => {
                            if (err && (err.status === 404 ||
                                (err.message && String(err.message).indexOf('not found') >= 0) ||
                                (err.errorCode && String(err.errorCode).indexOf('project file') >= 0))) {
                                return {ok: false, buffer: null, title};
                            }
                            throw err;
                        });
                })
                .then(({ok, buffer, title}) => {
                    this.props.onSetCloudProjectPageId(projectPageId);
                    this._loadedId = projectPageId;
                    this._pendingId = '';
                    if (authenticated && title) {
                        this.props.onUpdateProjectTitle(title);
                        if (typeof document !== 'undefined') {
                            document.title = title;
                        }
                    }
                    if (!ok || !buffer) {
                        if (this.props.onSetProjectUnchanged) {
                            this.props.onSetProjectUnchanged();
                        }
                        this._releaseLoader();
                        return null;
                    }

                    const before = this.props.loadingState;
                    const action = requestProjectUploadAction(before);
                    if (!action) {
                        this._started = false;
                        this._loadedId = '';
                        this._pendingId = projectPageId;
                        this._scheduleRetry();
                        return null;
                    }
                    this.props.dispatchProjectUpload(action);
                    return this.props.vm.loadProject(buffer).then(() => {
                        this._holdingLoader = false;
                        this.props.onCloudLoadFinished(LoadingState.LOADING_VM_FILE_UPLOAD, true);
                        if (this.props.onSetProjectUnchanged) {
                            this.props.onSetProjectUnchanged();
                        }
                    });
                })
                .catch(err => {
                    if (isCloudProjectUnavailableError(err) || isCloudProjectMissingError(err)) {
                        this._started = true;
                        this._pendingId = '';
                        this._holdingLoader = false;
                        this.props.onCloudProjectAccessBlocked();
                        return;
                    }
                    log.warn('cloud project load failed', err);
                    this._started = false;
                    this._pendingId = '';
                    if (this._loadedId === projectPageId) {
                        this._holdingLoader = false;
                        this.props.onCloudLoadFinished(LoadingState.LOADING_VM_FILE_UPLOAD, false);
                    } else {
                        this._releaseLoader();
                    }
                });
        }
        render () {
            return (
                <WrappedComponent
                    {...omit(this.props, CLOUD_LOADER_PROP_KEYS)}
                />
            );
        }
    }

    RobboCloudProjectLoaderComponent.propTypes = {
        cloudProjectPageId: PropTypes.string,
        dispatchCheckSession: PropTypes.func,
        dispatchProjectUpload: PropTypes.func,
        loadingState: PropTypes.oneOf(LoadingStates).isRequired,
        onCloudLoadFinished: PropTypes.func,
        onCloudProjectAccessBlocked: PropTypes.func,
        onCloudProjectAccessUnblocked: PropTypes.func,
        onSetCloudProjectPageId: PropTypes.func,
        onSetProjectUnchanged: PropTypes.func,
        onUpdateProjectTitle: PropTypes.func,
        openLoadingProject: PropTypes.func,
        closeLoadingProject: PropTypes.func,
        sessionStatus: PropTypes.string,
        vm: PropTypes.shape({
            loadProject: PropTypes.func
        })
    };

    const mapStateToProps = state => ({
        cloudProjectPageId: (state.scratchGui.robboAccount || {}).cloudProjectPageId || '',
        loadingState: state.scratchGui.projectState.loadingState,
        sessionStatus: (state.scratchGui.robboAccount || {}).sessionStatus || 'idle',
        vm: state.scratchGui.vm
    });

    const mapDispatchToProps = (dispatch, ownProps) => ({
        dispatchCheckSession: () => dispatch(checkSessionThunk()),
        dispatchProjectUpload: action => dispatch(action),
        openLoadingProject: () => dispatch(openLoadingProject()),
        closeLoadingProject: () => dispatch(closeLoadingProject()),
        onSetCloudProjectPageId: id => dispatch(setCloudProjectPageId(id)),
        onSetProjectUnchanged: () => dispatch(setProjectUnchanged()),
        onCloudProjectAccessBlocked: () => {
            dispatch(setCloudProjectAccessBlocked(true));
            dispatch(closeLoadingProject());
        },
        onCloudProjectAccessUnblocked: () => dispatch(setCloudProjectAccessBlocked(false)),
        onCloudLoadFinished: (loadingState, success) => {
            const canSave = typeof ownProps.canSave === 'boolean' ? ownProps.canSave : true;
            dispatch(onLoadedProject(loadingState, canSave, success));
            dispatch(closeLoadingProject());
        },
        onUpdateProjectTitle: title => dispatch(setProjectTitle(title))
    });

    const mergeProps = (stateProps, dispatchProps, ownProps) =>
        Object.assign({}, ownProps, dispatchProps, stateProps);

    return connect(
        mapStateToProps,
        mapDispatchToProps,
        mergeProps
    )(RobboCloudProjectLoaderComponent);
};

export default robboCloudProjectLoaderHOC;
