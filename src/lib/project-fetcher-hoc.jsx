import React from 'react';
import PropTypes from 'prop-types';
import {intlShape, injectIntl} from 'react-intl';
import bindAll from 'lodash.bindall';
import {connect} from 'react-redux';

import {setProjectUnchanged} from '../reducers/project-changed';
import {
    LoadingStates,
    getIsCreatingNew,
    getIsFetchingWithId,
    getIsLoading,
    getIsShowingProject,
    onFetchedProjectData,
    projectError,
    setProjectId
} from '../reducers/project-state';
import {
    activateTab,
    BLOCKS_TAB_INDEX
} from '../reducers/editor-tab';
import {setProjectTitle} from '../reducers/project-title';

import {
    restoreValidSnapshot
} from './project-session-store';
import storage from './storage';
import validate from 'scratch-parser';
const isDefaultProjectId = projectId => projectId === null || typeof projectId === 'undefined' ||
    projectId.toString() === '0';

/* Higher Order Component to provide behavior for loading projects by id. If
 * there's no id, the default project is loaded.
 * @param {React.Component} WrappedComponent component to receive projectData prop
 * @returns {React.Component} component with project loading behavior
 */
const ProjectFetcherHOC = function (WrappedComponent) {
    class ProjectFetcherComponent extends React.Component {
        constructor (props) {
            super(props);
            bindAll(this, [
                'fetchProject',
                'loadProjectFromStorage'
            ]);
            this.shouldAttemptSessionRestore = true;
            storage.setProjectHost(props.projectHost);
            storage.setAssetHost(props.assetHost);
            storage.setTranslatorFunction(props.intl.formatMessage);
            // props.projectId might be unset, in which case we use our default;
            // or it may be set by an even higher HOC, and passed to us.
            // Either way, we now know what the initial projectId should be, so
            // set it in the redux store.
            if (
                props.projectId !== '' &&
                props.projectId !== null &&
                typeof props.projectId !== 'undefined'
            ) {
                this.props.setProjectId(props.projectId.toString());
            }
        }
        componentDidUpdate (prevProps) {
            if (prevProps.projectHost !== this.props.projectHost) {
                storage.setProjectHost(this.props.projectHost);
            }
            if (prevProps.assetHost !== this.props.assetHost) {
                storage.setAssetHost(this.props.assetHost);
            }
            if (this.props.isFetchingWithId && !prevProps.isFetchingWithId) {
                this.fetchProject(this.props.reduxProjectId, this.props.loadingState);
            }
            if (this.props.isShowingProject && !prevProps.isShowingProject) {
                this.props.onProjectUnchanged();
            }
            if (this.props.isShowingProject && (prevProps.isLoadingProject || prevProps.isCreatingNew)) {
                this.props.onActivateTab(BLOCKS_TAB_INDEX);
            }
        }


        validateProject (input) {
            if (typeof input === 'object' && !(input instanceof ArrayBuffer) &&
                !ArrayBuffer.isView(input)) {
                // If the input is an object and not any ArrayBuffer
                // or an ArrayBuffer view (this includes all typed arrays and DataViews)
                // turn the object into a JSON string, because we suspect
                // this is a project.json as an object
                // validate expects a string or buffer as input
                input = JSON.stringify(input);
            }

            const validationPromise = new Promise((resolve, reject) => {
                // The second argument of false below indicates to the validator that the
                // input should be parsed/validated as an entire project (and not a single sprite)
                validate(input, false, (error, res) => {
                    if (error) return reject(error);
                    resolve(res);
                });
            });

            return validationPromise
                .then(() => Promise.resolve(input))
                .catch(error => {
                    // Intentionally rejecting here because the caller decides the fallback path.
                    if (error.hasOwnProperty('validationError')) {
                        return Promise.reject(JSON.stringify(error));
                    }
                    return Promise.reject(error);
                });
        }

        loadProjectFromStorage (projectId, loadingState) {
            return storage
                .load(storage.AssetType.Project, projectId, storage.DataFormat.JSON)
                .then(projectAsset => {
                    if (projectAsset) {
                        this.props.onFetchedProjectData(projectAsset.data, loadingState);
                    }
                })
                .catch(err => this.props.onError(err));
        }

        fetchProject (projectId, loadingState) {
            const shouldRestoreSession = this.shouldAttemptSessionRestore &&
                isDefaultProjectId(projectId) &&
                !(typeof window !== 'undefined' &&
                    (window.__ROBBO_NW_PENDING_PROJECT__ || window.__ROBBO_NW_LOADING_PROJECT__));

            this.shouldAttemptSessionRestore = false;

            if (!shouldRestoreSession) {
                return this.loadProjectFromStorage(projectId, loadingState);
            }

            return restoreValidSnapshot(input => this.validateProject(input))
                .then(restoredSnapshot => {
                    if (restoredSnapshot) {
                        if (restoredSnapshot.metadata && restoredSnapshot.metadata.title) {
                            this.props.onRestoreProjectTitle(restoredSnapshot.metadata.title);
                        }
                        this.props.onFetchedProjectData(restoredSnapshot.projectData, loadingState);
                        return;
                    }
                    return this.loadProjectFromStorage(projectId, loadingState);
                })
                .catch(() => this.loadProjectFromStorage(projectId, loadingState));
        }
        render () {
            const {
                /* eslint-disable no-unused-vars */
                assetHost,
                intl,
                isLoadingProject: isLoadingProjectProp,
                loadingState,
                onActivateTab,
                onError: onErrorProp,
                onFetchedProjectData: onFetchedProjectDataProp,
                onProjectUnchanged,
                onRestoreProjectTitle: onRestoreProjectTitleProp,
                projectHost,
                projectId,
                reduxProjectId,
                setProjectId: setProjectIdProp,
                /* eslint-enable no-unused-vars */
                isFetchingWithId: isFetchingWithIdProp,
                ...componentProps
            } = this.props;
            return (
                <WrappedComponent
                    fetchingProject={isFetchingWithIdProp}
                    {...componentProps}
                />
            );
        }
    }
    ProjectFetcherComponent.propTypes = {
        assetHost: PropTypes.string,
        canSave: PropTypes.bool,
        intl: intlShape.isRequired,
        isFetchingWithId: PropTypes.bool,
        isLoadingProject: PropTypes.bool,
        loadingState: PropTypes.oneOf(LoadingStates),
        onActivateTab: PropTypes.func,
        onError: PropTypes.func,
        onFetchedProjectData: PropTypes.func,
        onProjectUnchanged: PropTypes.func,
        onRestoreProjectTitle: PropTypes.func,
        projectHost: PropTypes.string,
        projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        reduxProjectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        setProjectId: PropTypes.func
    };
    ProjectFetcherComponent.defaultProps = {
        assetHost: 'https://assets.scratch.mit.edu',
        projectHost: 'https://projects.scratch.mit.edu'
    };

    const mapStateToProps = state => ({
        isCreatingNew: getIsCreatingNew(state.scratchGui.projectState.loadingState),
        isFetchingWithId: getIsFetchingWithId(state.scratchGui.projectState.loadingState),
        isLoadingProject: getIsLoading(state.scratchGui.projectState.loadingState),
        isShowingProject: getIsShowingProject(state.scratchGui.projectState.loadingState),
        loadingState: state.scratchGui.projectState.loadingState,
        reduxProjectId: state.scratchGui.projectState.projectId
    });
    const mapDispatchToProps = dispatch => ({
        onActivateTab: tab => dispatch(activateTab(tab)),
        onError: error => dispatch(projectError(error)),
        onFetchedProjectData: (projectData, loadingState) =>
            dispatch(onFetchedProjectData(projectData, loadingState)),
        onRestoreProjectTitle: title => dispatch(setProjectTitle(title)),
        setProjectId: projectId => dispatch(setProjectId(projectId)),
        onProjectUnchanged: () => dispatch(setProjectUnchanged())
    });
    // Allow incoming props to override redux-provided props. Used to mock in tests.
    const mergeProps = (stateProps, dispatchProps, ownProps) => Object.assign(
        {}, stateProps, dispatchProps, ownProps
    );
    return injectIntl(connect(
        mapStateToProps,
        mapDispatchToProps,
        mergeProps
    )(ProjectFetcherComponent));
};

export {
    ProjectFetcherHOC as default
};
