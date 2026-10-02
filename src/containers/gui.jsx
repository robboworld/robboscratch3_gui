import PropTypes from 'prop-types';
import React from 'react';
import {compose} from 'redux';
import {connect} from 'react-redux';
import ReactModal from 'react-modal';
import VM from 'scratch-vm';
import {injectIntl, intlShape} from 'react-intl';
import bindAll from 'lodash.bindall';
import debounce from 'lodash.debounce';

import ErrorBoundaryHOC from '../lib/error-boundary-hoc.jsx';
import {
    getIsError,
    getIsShowingProject
} from '../reducers/project-state';
import {
    activateTab,
    BLOCKS_TAB_INDEX,
    COSTUMES_TAB_INDEX,
    SOUNDS_TAB_INDEX
} from '../reducers/editor-tab';

import {
    closeCostumeLibrary,
    closeBackdropLibrary,
    closeTelemetryModal,
    closeScenariosLibrary,
    openExtensionLibrary
} from '../reducers/modals';

import FontLoaderHOC from '../lib/font-loader-hoc.jsx';
import nwCliProjectOpenerHOC from '../lib/nw-cli-project-opener-hoc.jsx';
import robboCloudProjectLoaderHOC from '../lib/robbo-cloud-project-loader-hoc.jsx';
import LocalizationHOC from '../lib/localization-hoc.jsx';
import SBFileUploaderHOC from '../lib/sb-file-uploader-hoc.jsx';
import ProjectFetcherHOC from '../lib/project-fetcher-hoc.jsx';
import TitledHOC from '../lib/titled-hoc.jsx';
import ProjectSaverHOC from '../lib/project-saver-hoc.jsx';
import QueryParserHOC from '../lib/query-parser-hoc.jsx';
import {
    removeSnapshot as removeSessionSnapshot,
    saveSnapshot as saveSessionSnapshot
} from '../lib/project-session-store';
import storage from '../lib/storage';
import vmListenerHOC from '../lib/vm-listener-hoc.jsx';
import vmManagerHOC from '../lib/vm-manager-hoc.jsx';
import cloudManagerHOC from '../lib/cloud-manager-hoc.jsx';
import systemPreferencesHOC from '../lib/system-preferences-hoc.jsx';

import GUIComponent from '../components/gui/gui.jsx';
import RobboSimulatorVmSync from './robbo-simulator-vm-sync.jsx';
import {setIsScratchDesktop} from '../lib/isScratchDesktop.js';

import {DragDropContext} from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

import {withAlert} from 'react-alert';

const {RequestMetadata, setMetadata, unsetMetadata} = storage.scratchFetch;

const setProjectIdMetadata = projectId => {
    // If project ID is '0' or zero, it's not a real project ID. In that case, remove the project ID metadata.
    // Same if it's null undefined.
    if (projectId && projectId !== '0') {
        setMetadata(RequestMetadata.ProjectId, projectId);
    } else {
        unsetMetadata(RequestMetadata.ProjectId);
    }
};

/** Delay after last PROJECT_CHANGED before session snapshot (ms). */
const AUTOSAVE_DEBOUNCE_MS = 1000;
/** While changes are continuous, flush at least this often (ms). */
const AUTOSAVE_MAX_WAIT_MS = 10000;

class GUI extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'autoSaveProject',
            'handlePageHide',
            'handleVmProjectChanged',
            'startProjectAutosaving'
        ]);
        this.isAutoSaving = false;
        this.projectChangeToken = 0;
        this.lastAutoSavedChangeToken = 0;
        this.didClearBrokenSnapshot = false;
        this.lastAutoSavedLayout = null;
        this.scheduleDebouncedAutoSave = debounce(
            () => this.autoSaveProject(),
            AUTOSAVE_DEBOUNCE_MS,
            {maxWait: AUTOSAVE_MAX_WAIT_MS}
        );
    }

    componentDidMount () {
        setIsScratchDesktop(this.props.isScratchDesktop);
        this.props.onStorageInit(storage);
        this.props.onVmInit(this.props.vm);
        setProjectIdMetadata(this.props.projectId);
        this.props.vm.on('PROJECT_CHANGED', this.handleVmProjectChanged);
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', this.handlePageHide);
        }
        if (typeof window !== 'undefined') {
            window.addEventListener('pagehide', this.handlePageHide);
        }

        if (!this.props.isError) {
            this.startProjectAutosaving();
        }
    }
    componentDidUpdate (prevProps) {
        if (this.props.projectId !== prevProps.projectId) {
            if (this.props.projectId !== null) {
                this.props.onUpdateProjectId(this.props.projectId);
            }
            setProjectIdMetadata(this.props.projectId);
        }
        if (this.props.isShowingProject &&
            (this.props.isRightPanelHidden !== prevProps.isRightPanelHidden ||
                this.props.isBlocksPaletteCollapsed !== prevProps.isBlocksPaletteCollapsed ||
                this.props.blocksPaletteFlyoutWidth !== prevProps.blocksPaletteFlyoutWidth ||
                this.props.isRobboUiHidden !== prevProps.isRobboUiHidden)) {
            this.scheduleDebouncedAutoSave();
        }
        if (this.props.isShowingProject && !prevProps.isShowingProject) {
            // this only notifies container when a project changes from not yet loaded to loaded
            // At this time the project view in www doesn't need to know when a project is unloaded
            this.props.onProjectLoaded();
            this.autoSaveProject({force: true});
        }
        if (this.props.shouldStopProject && !prevProps.shouldStopProject) {
            this.props.vm.stopAll();
        }
    }
    componentWillUnmount () {
        if (this.scheduleDebouncedAutoSave) {
            this.scheduleDebouncedAutoSave.flush();
            this.scheduleDebouncedAutoSave.cancel();
        }
        this.props.vm.removeListener('PROJECT_CHANGED', this.handleVmProjectChanged);
        if (typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', this.handlePageHide);
        }
        if (typeof window !== 'undefined') {
            window.removeEventListener('pagehide', this.handlePageHide);
        }
    }
    handleVmProjectChanged () {
        if (this.props.isShowingProject) {
            this.projectChangeToken += 1;
            this.scheduleDebouncedAutoSave();
        }
    }
    handlePageHide (event) {
        if (typeof document !== 'undefined' &&
            document.visibilityState &&
            document.visibilityState !== 'hidden' &&
            event &&
            event.type === 'visibilitychange') {
            return;
        }
        if (this.scheduleDebouncedAutoSave) {
            this.scheduleDebouncedAutoSave.flush();
        }
        this.autoSaveProject();
    }
    autoSaveProject (options) {
        const force = options && options.force === true;
        const nextChangeToken = this.projectChangeToken;

        if (this.isAutoSaving || !this.props.isShowingProject) {
            return Promise.resolve(false);
        }

        if (this.props.isPlayerOnly || typeof this.props.vm.saveProjectSb3_auto !== 'function') {
            return Promise.resolve(false);
        }

        const hasPendingVmChanges = nextChangeToken > this.lastAutoSavedChangeToken;
        const hasPendingLayoutChanges = this.hasLayoutChangedSinceLastSave();
        if (!force && !hasPendingVmChanges && !hasPendingLayoutChanges) {
            return Promise.resolve(false);
        }

        this.isAutoSaving = true;
        const savedUpToToken = nextChangeToken;

        return this.props.vm.saveProjectSb3_auto()
            .then(blob => saveSessionSnapshot({
                blob,
                metadata: {
                    title: this.props.projectTitle,
                    layout: {
                        isRightPanelHidden: this.props.isRightPanelHidden,
                        isBlocksPaletteCollapsed: this.props.isBlocksPaletteCollapsed,
                        blocksPaletteFlyoutWidth: this.props.blocksPaletteFlyoutWidth,
                        isRobboUiHidden: this.props.isRobboUiHidden
                    }
                }
            }))
            .then(() => {
                this.lastAutoSavedChangeToken = savedUpToToken;
                this.lastAutoSavedLayout = {
                    isRightPanelHidden: this.props.isRightPanelHidden,
                    isBlocksPaletteCollapsed: this.props.isBlocksPaletteCollapsed,
                    blocksPaletteFlyoutWidth: this.props.blocksPaletteFlyoutWidth,
                    isRobboUiHidden: this.props.isRobboUiHidden
                };
                return true;
            })
            .catch(() => false)
            .then(result => {
                this.isAutoSaving = false;
                if (result &&
                    this.props.isShowingProject &&
                    (this.projectChangeToken > this.lastAutoSavedChangeToken ||
                        this.hasLayoutChangedSinceLastSave())) {
                    return this.autoSaveProject();
                }
                return result;
            });
    }
    hasLayoutChangedSinceLastSave () {
        const saved = this.lastAutoSavedLayout;
        if (!saved) {
            return true;
        }
        return saved.isRightPanelHidden !== this.props.isRightPanelHidden ||
            saved.isBlocksPaletteCollapsed !== this.props.isBlocksPaletteCollapsed ||
            saved.blocksPaletteFlyoutWidth !== this.props.blocksPaletteFlyoutWidth ||
            saved.isRobboUiHidden !== this.props.isRobboUiHidden;
    }
    startProjectAutosaving () {
        // Session snapshot is driven by PROJECT_CHANGED + debounce (see handleVmProjectChanged).
    }
    clearBrokenSnapshot () {
        removeSessionSnapshot()
            .catch(() => {});
    }
    render () {


        if (this.props.isError) {
            if (this.scheduleDebouncedAutoSave) {
                this.scheduleDebouncedAutoSave.cancel();
            }

            this.props.alert.error(<div>{`Error in Scratch GUI:  ${this.props.error}`}</div>, {timeout: 0});
            if (!this.didClearBrokenSnapshot) {
                this.didClearBrokenSnapshot = true;
                this.clearBrokenSnapshot();
            }

            throw new Error(
                `Error in Scratch GUI [location=${window.location}]: ${this.props.error}`);
        }
        const {
            /* eslint-disable no-unused-vars */
            assetHost,
            cloudHost,
            error,
            isError,
            isScratchDesktop,
            isShowingProject,
            onProjectLoaded,
            onStorageInit,
            onUpdateProjectId,
            onVmInit,
            projectHost,
            projectId,
            projectTitle,
            projectChanged,
            /* eslint-enable no-unused-vars */
            children,
            fetchingProject,
            isLoading,
            isBlocksWorkspaceLayoutPending,
            loadingStateVisible,
            ...componentProps
        } = this.props;
        return (
            <React.Fragment>
                <GUIComponent
                    loading={fetchingProject || isLoading || loadingStateVisible || isBlocksWorkspaceLayoutPending}
                    {...componentProps}
                >
                    {children}
                </GUIComponent>
                <RobboSimulatorVmSync />
            </React.Fragment>
        );
    }
}

GUI.propTypes = {
    assetHost: PropTypes.string,
    children: PropTypes.node,
    cloudHost: PropTypes.string,
    error: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
    fetchingProject: PropTypes.bool,
    intl: intlShape,
    isError: PropTypes.bool,
    isLoading: PropTypes.bool,
    isBlocksWorkspaceLayoutPending: PropTypes.bool,
    isScratchDesktop: PropTypes.bool,
    isShowingProject: PropTypes.bool,
    isRightPanelHidden: PropTypes.bool,
    isBlocksPaletteCollapsed: PropTypes.bool,
    blocksPaletteFlyoutWidth: PropTypes.number,
    isRobboUiHidden: PropTypes.bool,
    isTotallyNormal: PropTypes.bool,
    loadingStateVisible: PropTypes.bool,
    onProjectLoaded: PropTypes.func,
    onSeeCommunity: PropTypes.func,
    onStorageInit: PropTypes.func,
    onUpdateProjectId: PropTypes.func,
    onVmInit: PropTypes.func,
    projectChanged: PropTypes.bool,
    projectHost: PropTypes.string,
    projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    projectTitle: PropTypes.string,
    shouldStopProject: PropTypes.bool,
    telemetryModalVisible: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired
};

GUI.defaultProps = {
    isScratchDesktop: false,
    isTotallyNormal: false,
    onStorageInit: storageInstance => storageInstance.addOfficialScratchWebStores(),
    onProjectLoaded: () => {},
    onUpdateProjectId: () => {},
    onVmInit: (/* vm */) => {}
};

const mapStateToProps = state => {
    const loadingState = state.scratchGui.projectState.loadingState;
    return {
        activeTabIndex: state.scratchGui.editorTab.activeTabIndex,
        alertsVisible: state.scratchGui.alerts.visible,
        backdropLibraryVisible: state.scratchGui.modals.backdropLibrary,
        blocksTabVisible: state.scratchGui.editorTab.activeTabIndex === BLOCKS_TAB_INDEX,
        cardsVisible: state.scratchGui.cards.visible,
        connectionModalVisible: state.scratchGui.modals.connectionModal,
        costumeLibraryVisible: state.scratchGui.modals.costumeLibrary,
        costumesTabVisible: state.scratchGui.editorTab.activeTabIndex === COSTUMES_TAB_INDEX,
        error: state.scratchGui.projectState.error,
        isError: getIsError(loadingState),
        isFullScreen: state.scratchGui.mode.isFullScreen,
        isPlayerOnly: state.scratchGui.mode.isPlayerOnly,
        isRightPanelHidden: state.scratchGui.layoutVisibility.isRightPanelHidden,
        isBlocksPaletteCollapsed: state.scratchGui.layoutVisibility.isBlocksPaletteCollapsed,
        blocksPaletteFlyoutWidth: state.scratchGui.layoutVisibility.blocksPaletteFlyoutWidth,
        isRobboUiHidden: state.scratchGui.layoutVisibility.isRobboUiHidden,
        isBlocksWorkspaceLayoutPending: state.scratchGui.layoutVisibility.isBlocksWorkspaceLayoutPending,
        isRtl: state.locales.isRtl,
        projectChanged: state.scratchGui.projectChanged,
        isShowingProject: getIsShowingProject(loadingState),
        loadingStateVisible: state.scratchGui.modals.loadingProject,
        projectId: state.scratchGui.projectState.projectId,
        projectTitle: state.scratchGui.projectTitle,
        soundsTabVisible: state.scratchGui.editorTab.activeTabIndex === SOUNDS_TAB_INDEX,
        targetIsStage: (
            state.scratchGui.targets.stage &&
            state.scratchGui.targets.stage.id === state.scratchGui.targets.editingTarget
        ),
        telemetryModalVisible: state.scratchGui.modals.telemetryModal,
        tipsLibraryVisible: state.scratchGui.modals.tipsLibrary,
        vm: state.scratchGui.vm
    };
};

const mapDispatchToProps = dispatch => ({
    onExtensionButtonClick: () => dispatch(openExtensionLibrary()),
    onActivateTab: tab => dispatch(activateTab(tab)),
    onActivateCostumesTab: () => dispatch(activateTab(COSTUMES_TAB_INDEX)),
    onActivateSoundsTab: () => dispatch(activateTab(SOUNDS_TAB_INDEX)),
    onRequestCloseBackdropLibrary: () => dispatch(closeBackdropLibrary()),
    onRequestCloseCostumeLibrary: () => dispatch(closeCostumeLibrary()),
    onRequestCloseScenariosLibrary: () => dispatch(closeScenariosLibrary()),
    onRequestCloseTelemetryModal: () => dispatch(closeTelemetryModal())
});

// const ConnectedGUI = injectIntl(connect(
//     mapStateToProps,
//     mapDispatchToProps,
// )(GUI));

const ConnectedGUI = injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(DragDropContext(HTML5Backend)(withAlert()(GUI)))); // modified_by_Yaroslav

// note that redux's 'compose' function is just being used as a general utility to make
// the hierarchy of HOC constructor calls clearer here; it has nothing to do with redux's
// ability to compose reducers.
const WrappedGui = compose(
    LocalizationHOC,
    ErrorBoundaryHOC('Top Level App'),
    FontLoaderHOC,
    QueryParserHOC,
    ProjectFetcherHOC,
    TitledHOC,
    ProjectSaverHOC,
    vmListenerHOC,
    vmManagerHOC,
    SBFileUploaderHOC,
    nwCliProjectOpenerHOC,
    robboCloudProjectLoaderHOC,
    cloudManagerHOC,
    systemPreferencesHOC
)(ConnectedGUI);

WrappedGui.setAppElement = ReactModal.setAppElement;
export default WrappedGui;
