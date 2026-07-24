import bindAll from 'lodash.bindall';
import omit from 'lodash.omit';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import queryString from 'query-string';

import log from './log';
import {downloadProjectSb3, getProjectPage} from './robbo-account/robboAccountClient';
import {setCloudProjectPageId} from '../RobboGui/actions/robboAccountActions';
import {
    LoadingState,
    LoadingStates,
    onLoadedProject,
    requestProjectUpload as requestProjectUploadAction
} from '../reducers/project-state';
import {openLoadingProject, closeLoadingProject} from '../reducers/modals';
import {setProjectTitle} from '../reducers/project-title';

const UUID_RE = /^[0-9a-fA-F-]{36}$/;

const CLOUD_LOADER_PROP_KEYS = [
    'dispatchProjectUpload',
    'loadingState',
    'onCloudLoadFinished',
    'onSetCloudProjectPageId',
    'onUpdateProjectTitle',
    'openLoadingProject'
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
                'parseProjectPageId'
            ]);
            this._started = false;
            this._retryTimer = null;
            this._retryCount = 0;
        }
        componentDidMount () {
            this.tryLoadCloudProject();
        }
        componentDidUpdate (prevProps) {
            if (this._started) {
                return;
            }
            if (this._canAcceptFileLoad(this.props.loadingState) &&
                !this._canAcceptFileLoad(prevProps.loadingState)) {
                this.tryLoadCloudProject();
            }
        }
        componentWillUnmount () {
            if (this._retryTimer) {
                clearTimeout(this._retryTimer);
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
            const projectPageId = this.parseProjectPageId();
            if (!projectPageId) {
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

            this._started = true;
            this.props.onSetCloudProjectPageId(projectPageId);
            this.props.dispatchProjectUpload(action);
            this.props.openLoadingProject();

            // Fetch metadata (title) and sb3 in parallel; missing sb3 = new empty cloud project.
            const metaPromise = getProjectPage(projectPageId)
                .then(resp => {
                    const page = resp && resp.projectPage;
                    return (page && page.title) || '';
                })
                .catch(err => {
                    log.warn('cloud project meta load failed', err);
                    return '';
                });

            const sb3Promise = downloadProjectSb3(projectPageId)
                .then(buffer => ({ok: true, buffer}))
                .catch(err => {
                    // Newly created pages may not have an uploaded .sb3 yet.
                    if (err && (err.status === 404 ||
                        (err.message && String(err.message).indexOf('not found') >= 0) ||
                        err.errorCode === 'project file not found')) {
                        return {ok: false, buffer: null};
                    }
                    throw err;
                });

            Promise.all([sb3Promise, metaPromise])
                .then(([sb3, title]) => {
                    const afterTitle = () => {
                        if (title) {
                            this.props.onUpdateProjectTitle(title);
                            document.title = title;
                        }
                        this.props.onCloudLoadFinished(LoadingState.LOADING_VM_FILE_UPLOAD, true);
                    };
                    if (!sb3.ok || !sb3.buffer) {
                        afterTitle();
                        return null;
                    }
                    return this.props.vm.loadProject(sb3.buffer).then(afterTitle);
                })
                .catch(err => {
                    log.warn('cloud project load failed', err);
                    this.props.onCloudLoadFinished(LoadingState.LOADING_VM_FILE_UPLOAD, false);
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
        dispatchProjectUpload: PropTypes.func,
        loadingState: PropTypes.oneOf(LoadingStates).isRequired,
        onCloudLoadFinished: PropTypes.func,
        onSetCloudProjectPageId: PropTypes.func,
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
        onSetCloudProjectPageId: id => dispatch(setCloudProjectPageId(id)),
        onCloudLoadFinished: (loadingState, success) => {
            // canSave true so File→Save cloud path stays available after load.
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
