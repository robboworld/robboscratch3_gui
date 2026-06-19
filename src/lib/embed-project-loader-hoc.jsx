import bindAll from 'lodash.bindall';
import React from 'react';
import PropTypes from 'prop-types';
import queryString from 'query-string';
import {connect} from 'react-redux';
import VM from 'scratch-vm';

import {
    LoadingState,
    onLoadedProject,
    projectError,
    requestProjectUpload,
    setProjectId
} from '../reducers/project-state';

/**
 * Loads a project from signed playUrl/jsonUrl query params (LK iframe embed).
 * Falls back to hash / projectRef when URLs are absent.
 */
const EmbedProjectLoaderHOC = function (WrappedComponent) {
    class EmbedProjectLoaderComponent extends React.Component {
        constructor (props) {
            super(props);
            bindAll(this, [
                'loadFromSignedUrls',
                'notifyParent'
            ]);
            const q = typeof window !== 'undefined' ? queryString.parse(window.location.search) : {};
            this.embedMode = q.embed === '1';
            this.hasSignedUrls = Boolean(q.playUrl || q.jsonUrl);
        }
        componentDidMount () {
            if (this.embedMode && typeof window !== 'undefined') {
                window.onbeforeunload = null;
            }
            if (this.hasSignedUrls) {
                this.loadFromSignedUrls();
                return;
            }
            const q = queryString.parse(window.location.search);
            if (q.projectRef) {
                this.props.setProjectId(String(q.projectRef));
            }
        }
        notifyParent (type, payload) {
            if (!this.embedMode || typeof window === 'undefined' || window.parent === window) {
                return;
            }
            window.parent.postMessage(Object.assign({type}, payload || {}), '*');
        }
        loadFromSignedUrls () {
            const q = queryString.parse(window.location.search);
            const uploadAction = requestProjectUpload(this.props.loadingState);
            if (!uploadAction) {
                const err = new Error('Cannot load embedded project in current state');
                this.props.onError(err);
                this.notifyParent('scratch:error', {message: String(err)});
                return;
            }
            this.props.dispatchRequestProjectUpload(uploadAction);

            const loadIntoVm = projectData =>
                this.props.vm.loadProject(projectData)
                    .then(() => {
                        this.props.onLoadedProject(LoadingState.LOADING_VM_FILE_UPLOAD, false);
                        this.notifyParent('scratch:ready');
                    });

            const tryJson = () => {
                if (!q.jsonUrl) {
                    return Promise.reject(new Error('jsonUrl missing'));
                }
                return fetch(q.jsonUrl)
                    .then(res => {
                        if (!res.ok) throw new Error(`jsonUrl HTTP ${res.status}`);
                        return res.json();
                    })
                    .then(json => loadIntoVm(json));
            };
            const tryPlay = () => {
                if (!q.playUrl) {
                    return tryJson();
                }
                return fetch(q.playUrl)
                    .then(res => {
                        if (!res.ok) throw new Error(`playUrl HTTP ${res.status}`);
                        return res.arrayBuffer();
                    })
                    .then(buf => loadIntoVm(buf))
                    .catch(() => tryJson());
            };
            tryPlay().catch(err => {
                this.props.onError(err);
                this.notifyParent('scratch:error', {message: String(err)});
            });
        }
        render () {
            const {
                loadingState,
                onError,
                onLoadedProject: onLoadedProjectProp,
                dispatchRequestProjectUpload,
                vm,
                setProjectId: setProjectIdProp,
                ...componentProps
            } = this.props;
            return (
                <WrappedComponent
                    {...componentProps}
                    embedMode={this.embedMode}
                    skipHashParser={this.hasSignedUrls}
                />
            );
        }
    }
    EmbedProjectLoaderComponent.propTypes = {
        dispatchRequestProjectUpload: PropTypes.func,
        loadingState: PropTypes.string,
        onError: PropTypes.func,
        onLoadedProject: PropTypes.func,
        setProjectId: PropTypes.func,
        vm: PropTypes.instanceOf(VM)
    };
    const mapStateToProps = state => ({
        loadingState: state.scratchGui.projectState.loadingState,
        vm: state.scratchGui.vm
    });
    const mapDispatchToProps = dispatch => ({
        dispatchRequestProjectUpload: action => dispatch(action),
        onError: error => dispatch(projectError(error)),
        onLoadedProject: (loadingState, canSave) =>
            dispatch(onLoadedProject(loadingState, canSave, true)),
        setProjectId: projectId => dispatch(setProjectId(projectId))
    });
    return connect(mapStateToProps, mapDispatchToProps)(EmbedProjectLoaderComponent);
};

export default EmbedProjectLoaderHOC;
