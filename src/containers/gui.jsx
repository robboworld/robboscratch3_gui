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
import {
    clearProjectSaveTarget,
    describeSaveTargetForDraft,
    getProjectSaveTarget,
    rememberDraftFileHandle,
    setProjectSaveTarget,
    subscribeProjectSaveTarget,
    takePendingRestoredDraft
} from '../lib/project-save-target';
import {setProjectChanged} from '../reducers/project-changed';
import {
    setDraftError,
    setDraftSaved,
    setRestoredDraft,
    setSaveTarget
} from '../reducers/project-save-status';
import storage from '../lib/storage';
import {detachCloudProjectThunk} from '../RobboGui/actions/robboAccountActions';
import {isNwRuntime} from '../lib/nw-open-project-utils';
import vmListenerHOC from '../lib/vm-listener-hoc.jsx';
import vmManagerHOC from '../lib/vm-manager-hoc.jsx';
import cloudManagerHOC from '../lib/cloud-manager-hoc.jsx';
import systemPreferencesHOC from '../lib/system-preferences-hoc.jsx';

import GUIComponent from '../components/gui/gui.jsx';
import CloudProjectNotFound from '../components/cloud-project-not-found/cloud-project-not-found.jsx';
import RobboSimulatorVmSync from './robbo-simulator-vm-sync.jsx';
import {setIsScratchDesktop} from '../lib/isScratchDesktop.js';
import hideLoadingSplash from '../lib/loading-splash';
import {preloadPaintEditor} from '../lib/paint-editor-loader';

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
/** A running program moves sprites and changes variables every frame: snapshot it less often (ms). */
const RUNTIME_AUTOSAVE_DEBOUNCE_MS = 2000;
const RUNTIME_AUTOSAVE_MAX_WAIT_MS = 30000;
/** Desktop: how long closing the window waits for the last draft (ms). */
const NW_CLOSE_SAVE_TIMEOUT_MS = 2000;

class GUI extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'autoSaveProject',
            'handlePageHide',
            'handleNwWindowClose',
            'handleProjectLoaded',
            'handleProjectRunStart',
            'handleProjectRunStop',
            'handleRuntimeStateChanged',
            'handleSaveTargetChanged',
            'handleVmProjectChanged'
        ]);
        this.isAutoSaving = false;
        this.autoSavePromise = null;
        this.autoSaveQueued = false;
        this.nwWindow = null;
        this.isClosingNwWindow = false;
        this.restoredDraftHasUnsavedChanges = false;
        this.lastAutoSavedProjectJson = null;
        this.lastAutoSavedMetadataKey = null;
        this.runtimeAutoSaveTimer = null;
        this.unsubscribeSaveTarget = null;
        this.didClearBrokenSnapshot = false;
        this.scheduleDebouncedAutoSave = debounce(
            () => this.autoSaveProject(),
            AUTOSAVE_DEBOUNCE_MS,
            {maxWait: AUTOSAVE_MAX_WAIT_MS}
        );
        this.scheduleRuntimeAutoSave = debounce(
            () => this.autoSaveProject(),
            RUNTIME_AUTOSAVE_DEBOUNCE_MS,
            {maxWait: RUNTIME_AUTOSAVE_MAX_WAIT_MS}
        );
    }

    componentDidMount () {
        setIsScratchDesktop(this.props.isScratchDesktop);
        this.props.onStorageInit(storage);
        this.props.onVmInit(this.props.vm);
        setProjectIdMetadata(this.props.projectId);
        this.props.vm.on('PROJECT_CHANGED', this.handleVmProjectChanged);
        // Program results (sprite positions, costumes, variables) do not emit PROJECT_CHANGED.
        this.props.vm.on('targetsUpdate', this.handleRuntimeStateChanged);
        this.props.vm.on('PROJECT_RUN_START', this.handleProjectRunStart);
        this.props.vm.on('PROJECT_RUN_STOP', this.handleProjectRunStop);
        this.props.vm.runtime.on('PROJECT_LOADED', this.handleProjectLoaded);
        this.unsubscribeSaveTarget = subscribeProjectSaveTarget(this.handleSaveTargetChanged);
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', this.handlePageHide);
        }
        if (typeof window !== 'undefined') {
            window.addEventListener('pagehide', this.handlePageHide);
        }
        if (isNwRuntime()) {
            try {
                this.nwWindow = window.nw.Window.get();
                this.nwWindow.on('close', this.handleNwWindowClose);
            } catch (e) {
                this.nwWindow = null;
            }
        }
    }
    componentDidUpdate (prevProps) {
        // Normally the Loader removes the static loading screen; this covers a project shown
        // (or failed) without the Loader ever mounting, so the screen never hides the editor.
        if (this.props.isShowingProject || this.props.isError) {
            hideLoadingSplash();
        }
        if (this.props.projectId !== prevProps.projectId) {
            if (this.props.projectId !== null) {
                this.props.onUpdateProjectId(this.props.projectId);
            }
            setProjectIdMetadata(this.props.projectId);
        }
        // Layout, title and meta.robboSimulator (sensors, simulators) are saved in the snapshot
        // but do not emit PROJECT_CHANGED.
        if (this.props.isShowingProject &&
            (this.props.isRightPanelHidden !== prevProps.isRightPanelHidden ||
                this.props.isBlocksPaletteCollapsed !== prevProps.isBlocksPaletteCollapsed ||
                this.props.blocksPaletteFlyoutWidth !== prevProps.blocksPaletteFlyoutWidth ||
                this.props.isRobboUiHidden !== prevProps.isRobboUiHidden ||
                this.props.projectTitle !== prevProps.projectTitle ||
                this.props.projectChanged !== prevProps.projectChanged ||
                this.props.autosaveRobotSensorsKey !== prevProps.autosaveRobotSensorsKey ||
                this.props.autosaveSimActivated !== prevProps.autosaveSimActivated ||
                this.props.autosaveCopterSimActivated !== prevProps.autosaveCopterSimActivated ||
                this.props.autosaveExtensionPackActivated !== prevProps.autosaveExtensionPackActivated)) {
            this.scheduleDebouncedAutoSave();
        }
        if (this.props.isShowingProject && !prevProps.isShowingProject && !this.props.isPlayerOnly) {
            // The editor is up: fetch the costume editor in the background (not in the first load).
            preloadPaintEditor();
        }
        if (this.props.isShowingProject && !prevProps.isShowingProject) {
            // this only notifies container when a project changes from not yet loaded to loaded
            // At this time the project view in www doesn't need to know when a project is unloaded
            this.props.onProjectLoaded();
            if (this.restoredDraftHasUnsavedChanges) {
                this.restoredDraftHasUnsavedChanges = false;
                // vmManagerHOC marks the loaded project unchanged in a setTimeout queued right after
                // this update; the nested setTimeout runs after it.
                setTimeout(() => setTimeout(() => this.props.onSetProjectChanged()));
            }
            this.autoSaveProject({force: true});
        }
        if (this.props.shouldStopProject && !prevProps.shouldStopProject) {
            this.props.vm.stopAll();
        }
    }
    componentWillUnmount () {
        this.scheduleDebouncedAutoSave.flush();
        this.scheduleDebouncedAutoSave.cancel();
        this.scheduleRuntimeAutoSave.cancel();
        this.stopRuntimeAutoSaveTimer();
        this.props.vm.removeListener('PROJECT_CHANGED', this.handleVmProjectChanged);
        this.props.vm.removeListener('targetsUpdate', this.handleRuntimeStateChanged);
        this.props.vm.removeListener('PROJECT_RUN_START', this.handleProjectRunStart);
        this.props.vm.removeListener('PROJECT_RUN_STOP', this.handleProjectRunStop);
        this.props.vm.runtime.removeListener('PROJECT_LOADED', this.handleProjectLoaded);
        if (this.unsubscribeSaveTarget) {
            this.unsubscribeSaveTarget();
            this.unsubscribeSaveTarget = null;
        }
        if (typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', this.handlePageHide);
        }
        if (typeof window !== 'undefined') {
            window.removeEventListener('pagehide', this.handlePageHide);
        }
        if (this.nwWindow) {
            this.nwWindow.removeListener('close', this.handleNwWindowClose);
            this.nwWindow = null;
        }
    }
    handleVmProjectChanged () {
        if (this.props.isShowingProject) {
            this.scheduleDebouncedAutoSave();
        }
    }
    handleRuntimeStateChanged () {
        if (this.props.isShowingProject) {
            this.scheduleRuntimeAutoSave();
        }
    }
    handleProjectRunStart () {
        // Variables can change without any targetsUpdate: check the running program periodically.
        if (!this.runtimeAutoSaveTimer) {
            this.runtimeAutoSaveTimer = setInterval(this.handleRuntimeStateChanged, RUNTIME_AUTOSAVE_MAX_WAIT_MS);
        }
    }
    handleProjectRunStop () {
        this.stopRuntimeAutoSaveTimer();
        this.handleRuntimeStateChanged();
    }
    stopRuntimeAutoSaveTimer () {
        if (this.runtimeAutoSaveTimer) {
            clearInterval(this.runtimeAutoSaveTimer);
            this.runtimeAutoSaveTimer = null;
        }
    }
    handleProjectLoaded () {
        const restored = takePendingRestoredDraft();
        if (restored) {
            // Session draft opened at start: keep its file for Ctrl+S and show what was opened.
            if (restored.target) {
                setProjectSaveTarget(restored.target);
            } else {
                clearProjectSaveTarget();
                this.props.onSaveTargetChanged(null);
            }
            // The draft had changes not saved to a file: tell what was opened, keep the dot on "File"
            // and the question before New / opening another project. A draft equal to its saved
            // file needs no notice: the user just sees the file again.
            this.restoredDraftHasUnsavedChanges = restored.hasUnsavedChanges === true;
            this.props.onDraftRestored(this.restoredDraftHasUnsavedChanges ?
                {title: restored.title, savedAt: restored.savedAt} :
                null);
            return;
        }
        // A different project is open: "Save" must not overwrite the previous file.
        // Loaders that know the source set the target again after vm.loadProject resolves.
        clearProjectSaveTarget();
        this.props.onSaveTargetChanged(null);
        // Nor the cloud project, unless it is the one being loaded.
        this.props.onDetachCloudProject();
        this.props.onDraftRestored(null);
    }
    handleSaveTargetChanged (target) {
        this.props.onSaveTargetChanged(target);
        rememberDraftFileHandle(target);
        // The draft remembers its file: Ctrl+S after a restart writes there.
        this.scheduleDebouncedAutoSave();
    }
    handlePageHide (event) {
        if (typeof document !== 'undefined' &&
            document.visibilityState &&
            document.visibilityState !== 'hidden' &&
            event &&
            event.type === 'visibilitychange') {
            return;
        }
        this.scheduleDebouncedAutoSave.flush();
        this.scheduleRuntimeAutoSave.flush();
        // Unchanged project is skipped inside (compared with the last snapshot).
        this.autoSaveProject();
    }
    handleNwWindowClose () {
        // NW.js does not wait for pagehide work: write the last draft, then close (at most ~2 s).
        const win = this.nwWindow;
        const closeNow = () => {
            try {
                win.close(true);
            } catch (e) {
                // The window is already gone.
            }
        };
        if (this.isClosingNwWindow) {
            closeNow();
            return;
        }
        this.isClosingNwWindow = true;
        let save;
        try {
            this.scheduleDebouncedAutoSave.cancel();
            this.scheduleRuntimeAutoSave.cancel();
            this.stopRuntimeAutoSaveTimer();
            save = Promise.resolve(this.autoSavePromise).then(() => this.autoSaveProject());
        } catch (e) {
            save = Promise.resolve();
        }
        const timeout = new Promise(resolve => setTimeout(resolve, NW_CLOSE_SAVE_TIMEOUT_MS));
        Promise.race([save, timeout]).then(closeNow, closeNow);
    }
    getSnapshotMetadata () {
        return {
            title: this.props.projectTitle,
            hasUnsavedChanges: this.props.projectChanged === true,
            saveTarget: describeSaveTargetForDraft(getProjectSaveTarget()),
            layout: {
                isRightPanelHidden: this.props.isRightPanelHidden,
                isBlocksPaletteCollapsed: this.props.isBlocksPaletteCollapsed,
                blocksPaletteFlyoutWidth: this.props.blocksPaletteFlyoutWidth,
                isRobboUiHidden: this.props.isRobboUiHidden
            }
        };
    }
    autoSaveProject (options) {
        const force = options && options.force === true;

        if (!this.props.isShowingProject ||
            this.props.isPlayerOnly ||
            typeof this.props.vm.saveProjectSb3_auto !== 'function') {
            return Promise.resolve(false);
        }

        if (this.isAutoSaving) {
            // The project may change while the snapshot is written: check again afterwards.
            this.autoSaveQueued = true;
            return Promise.resolve(false);
        }

        const metadata = this.getSnapshotMetadata();
        const metadataKey = JSON.stringify(metadata);
        let projectJson;
        try {
            projectJson = this.props.vm.toJSON();
        } catch (e) {
            return Promise.resolve(false);
        }
        // Serializing is cheap compared to zipping every costume and sound: skip unchanged projects.
        if (!force &&
            projectJson === this.lastAutoSavedProjectJson &&
            metadataKey === this.lastAutoSavedMetadataKey) {
            return Promise.resolve(false);
        }

        this.isAutoSaving = true;
        this.autoSavePromise = this.props.vm.saveProjectSb3_auto()
            .then(blob => saveSessionSnapshot({blob, metadata})
                .catch(error => {
                    this.props.onDraftError();
                    return Promise.reject(error);
                }))
            .then(() => {
                this.lastAutoSavedProjectJson = projectJson;
                this.lastAutoSavedMetadataKey = metadataKey;
                this.props.onDraftSaved(Date.now());
                return true;
            })
            .catch(() => false)
            .then(result => {
                this.isAutoSaving = false;
                this.autoSavePromise = null;
                if (this.autoSaveQueued && !this.isClosingNwWindow) {
                    this.autoSaveQueued = false;
                    this.scheduleDebouncedAutoSave();
                }
                return result;
            });
        return this.autoSavePromise;
    }
    clearBrokenSnapshot () {
        removeSessionSnapshot()
            .catch(() => {});
    }
    render () {


        if (this.props.isError) {
            this.scheduleDebouncedAutoSave.cancel();
            this.scheduleRuntimeAutoSave.cancel();
            this.stopRuntimeAutoSaveTimer();

            this.props.alert.error(<div>{`Error in Scratch GUI:  ${this.props.error}`}</div>, {timeout: 0});
            if (!this.didClearBrokenSnapshot) {
                this.didClearBrokenSnapshot = true;
                this.clearBrokenSnapshot();
            }

            throw new Error(
                `Error in Scratch GUI [location=${window.location}]: ${this.props.error}`);
        }
        if (this.props.cloudProjectAccessBlocked) {
            return <CloudProjectNotFound />;
        }
        const {
            /* eslint-disable no-unused-vars */
            assetHost,
            autosaveCopterSimActivated,
            autosaveExtensionPackActivated,
            autosaveRobotSensorsKey,
            autosaveSimActivated,
            cloudHost,
            cloudProjectAccessBlocked,
            error,
            isError,
            isScratchDesktop,
            isShowingProject,
            onDraftError,
            onDraftRestored,
            onDraftSaved,
            isRobboAccountAuthenticated,
            onDetachCloudProject,
            onProjectLoaded,
            onSaveTargetChanged,
            onSetProjectChanged,
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
    autosaveCopterSimActivated: PropTypes.bool,
    autosaveExtensionPackActivated: PropTypes.bool,
    autosaveRobotSensorsKey: PropTypes.string,
    autosaveSimActivated: PropTypes.bool,
    children: PropTypes.node,
    cloudHost: PropTypes.string,
    cloudProjectAccessBlocked: PropTypes.bool,
    error: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
    fetchingProject: PropTypes.bool,
    intl: intlShape,
    isError: PropTypes.bool,
    isLoading: PropTypes.bool,
    isPlayerOnly: PropTypes.bool,
    isRobboAccountAuthenticated: PropTypes.bool,
    isBlocksWorkspaceLayoutPending: PropTypes.bool,
    isScratchDesktop: PropTypes.bool,
    isShowingProject: PropTypes.bool,
    isRightPanelHidden: PropTypes.bool,
    isBlocksPaletteCollapsed: PropTypes.bool,
    blocksPaletteFlyoutWidth: PropTypes.number,
    isRobboUiHidden: PropTypes.bool,
    isTotallyNormal: PropTypes.bool,
    loadingStateVisible: PropTypes.bool,
    onDetachCloudProject: PropTypes.func,
    onDraftError: PropTypes.func,
    onDraftRestored: PropTypes.func,
    onDraftSaved: PropTypes.func,
    onProjectLoaded: PropTypes.func,
    onSaveTargetChanged: PropTypes.func,
    onSetProjectChanged: PropTypes.func,
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
    onDraftError: () => {},
    onDraftRestored: () => {},
    onDraftSaved: () => {},
    onProjectLoaded: () => {},
    onSaveTargetChanged: () => {},
    onSetProjectChanged: () => {},
    onUpdateProjectId: () => {},
    onVmInit: (/* vm */) => {}
};

/**
 * Sensor setup saved in meta.robboSimulator. robot_sensors also carries live sensor readings,
 * so compare only the saved fields.
 * @param {Array} sensors robot_sensors state
 * @returns {string} key that changes only when the saved setup changes
 */
const getRobotSensorsSaveKey = sensors => (Array.isArray(sensors) ? sensors : [])
    .map(sensor => (sensor ?
        `${sensor.sensor_name}:${sensor.sensor_active ? 1 : 0}:${sensor.is_sensor_version_new ? 1 : 0}` :
        ''))
    .join('|');

const mapStateToProps = state => {
    const loadingState = state.scratchGui.projectState.loadingState;
    return {
        activeTabIndex: state.scratchGui.editorTab.activeTabIndex,
        alertsVisible: state.scratchGui.alerts.visible,
        autosaveCopterSimActivated: state.scratchGui.settings.is_copter_sim_activated === true,
        autosaveExtensionPackActivated: state.scratchGui.extension_pack.is_extension_pack_activated === true,
        autosaveRobotSensorsKey: getRobotSensorsSaveKey(state.scratchGui.robot_sensors),
        autosaveSimActivated: state.scratchGui.settings.is_sim_activated === true,
        backdropLibraryVisible: state.scratchGui.modals.backdropLibrary,
        blocksTabVisible: state.scratchGui.editorTab.activeTabIndex === BLOCKS_TAB_INDEX,
        cardsVisible: state.scratchGui.cards.visible,
        connectionModalVisible: state.scratchGui.modals.connectionModal,
        costumeLibraryVisible: state.scratchGui.modals.costumeLibrary,
        costumesTabVisible: state.scratchGui.editorTab.activeTabIndex === COSTUMES_TAB_INDEX,
        cloudProjectAccessBlocked: (state.scratchGui.robboAccount || {}).cloudProjectAccessBlocked,
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
        isRobboAccountAuthenticated: (state.scratchGui.robboAccount || {}).sessionStatus === 'authenticated',
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
    onDetachCloudProject: () => dispatch(detachCloudProjectThunk()),
    onDraftError: () => dispatch(setDraftError()),
    onDraftRestored: draft => dispatch(setRestoredDraft(draft)),
    onDraftSaved: time => dispatch(setDraftSaved(time)),
    onSetProjectChanged: () => dispatch(setProjectChanged()),
    onSaveTargetChanged: target => dispatch(setSaveTarget(target)),
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
