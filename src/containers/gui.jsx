import PropTypes from 'prop-types';
import React from 'react';
import {compose} from 'redux';
import {connect} from 'react-redux';
import ReactModal from 'react-modal';
import VM from 'scratch-vm';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import bindAll from 'lodash.bindall';
import debounce from 'lodash.debounce';

import ErrorBoundaryHOC from '../lib/error-boundary-hoc.jsx';
import {
    getIsError,
    getIsShowingProject
} from '../reducers/project-state';
import {setProjectTitle} from '../reducers/project-title';
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
    openExtensionLibrary
} from '../reducers/modals';

import FontLoaderHOC from '../lib/font-loader-hoc.jsx';
import nwCliProjectOpenerHOC from '../lib/nw-cli-project-opener-hoc.jsx';
import LocalizationHOC from '../lib/localization-hoc.jsx';
import ProjectFetcherHOC from '../lib/project-fetcher-hoc.jsx';
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

import GUIComponent from '../components/gui/gui.jsx';
import RobboSimulatorVmSync from './robbo-simulator-vm-sync.jsx';
import {setIsScratchDesktop} from '../lib/isScratchDesktop.js';

import {DragDropContext} from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

import {withAlert} from 'react-alert';

const messages = defineMessages({
    defaultProjectTitle: {
        id: 'gui.gui.defaultProjectTitle',
        description: 'Default title for project',
        defaultMessage: 'Scratch Project'
    }
});

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
        this.scheduleDebouncedAutoSave = debounce(
            () => this.autoSaveProject(),
            AUTOSAVE_DEBOUNCE_MS,
            {maxWait: AUTOSAVE_MAX_WAIT_MS}
        );
    }

    componentDidMount () {
        setIsScratchDesktop(this.props.isScratchDesktop);
        this.setReduxTitle(this.props.projectTitle);
        this.props.onStorageInit(storage);
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
        if (this.props.projectId !== prevProps.projectId && this.props.projectId !== null) {
            this.props.onUpdateProjectId(this.props.projectId);
        }
        if (this.props.projectTitle !== prevProps.projectTitle) {
            this.setReduxTitle(this.props.projectTitle);
        }
        if (this.props.isShowingProject && !prevProps.isShowingProject) {
            // this only notifies container when a project changes from not yet loaded to loaded
            // At this time the project view in www doesn't need to know when a project is unloaded
            this.props.onProjectLoaded();
            this.autoSaveProject({force: true});
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

        const hasPendingVmChanges = nextChangeToken > this.lastAutoSavedChangeToken;
        if (!force && !hasPendingVmChanges) {
            return Promise.resolve(false);
        }

        this.isAutoSaving = true;
        const savedUpToToken = nextChangeToken;

        return this.props.vm.saveProjectSb3_auto()
            .then(blob => saveSessionSnapshot({
                blob,
                metadata: {
                    title: this.props.projectTitle
                }
            }))
            .then(() => {
                this.lastAutoSavedChangeToken = savedUpToToken;
                return true;
            })
            .catch(() => false)
            .then(result => {
                this.isAutoSaving = false;
                if (result &&
                    this.props.isShowingProject &&
                    this.projectChangeToken > this.lastAutoSavedChangeToken) {
                    return this.autoSaveProject();
                }
                return result;
            });
    }
    startProjectAutosaving () {
        // Session snapshot is driven by PROJECT_CHANGED + debounce (see handleVmProjectChanged).
    }
    clearBrokenSnapshot () {
        removeSessionSnapshot()
            .catch(() => {});
    }
    setReduxTitle (newTitle) {
        if (newTitle === null || typeof newTitle === 'undefined') {
            this.props.onUpdateReduxProjectTitle(
                this.props.intl.formatMessage(messages.defaultProjectTitle)
            );
        } else {
            this.props.onUpdateReduxProjectTitle(newTitle);
        }
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
            onUpdateReduxProjectTitle,
            projectHost,
            projectId,
            projectTitle,
            projectChanged,
            /* eslint-enable no-unused-vars */
            children,
            fetchingProject,
            isLoading,
            loadingStateVisible,
            ...componentProps
        } = this.props;
        return (
            <React.Fragment>
                <GUIComponent
                    loading={fetchingProject || isLoading || loadingStateVisible}
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
    importInfoVisible: PropTypes.bool,
    intl: intlShape,
    isError: PropTypes.bool,
    isLoading: PropTypes.bool,
    isScratchDesktop: PropTypes.bool,
    isShowingProject: PropTypes.bool,
    loadingStateVisible: PropTypes.bool,
    onProjectLoaded: PropTypes.func,
    onSeeCommunity: PropTypes.func,
    onStorageInit: PropTypes.func,
    onUpdateProjectId: PropTypes.func,
    onUpdateProjectTitle: PropTypes.func,
    onUpdateReduxProjectTitle: PropTypes.func,
    previewInfoVisible: PropTypes.bool,
    projectChanged: PropTypes.bool,
    projectHost: PropTypes.string,
    projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    projectTitle: PropTypes.string,
    telemetryModalVisible: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired
};

GUI.defaultProps = {
    isScratchDesktop: false,
    onStorageInit: storageInstance => storageInstance.addOfficialScratchWebStores(),
    onProjectLoaded: () => {},
    onUpdateProjectId: () => {}
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
        importInfoVisible: state.scratchGui.modals.importInfo,
        isError: getIsError(loadingState),
        isFullScreen: state.scratchGui.mode.isFullScreen,
        isPlayerOnly: state.scratchGui.mode.isPlayerOnly,
        isRtl: state.locales.isRtl,
        projectChanged: state.scratchGui.projectChanged,
        isShowingProject: getIsShowingProject(loadingState),
        loadingStateVisible: state.scratchGui.modals.loadingProject,
        previewInfoVisible: state.scratchGui.modals.previewInfo,
        projectId: state.scratchGui.projectState.projectId,
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
    onRequestCloseTelemetryModal: () => dispatch(closeTelemetryModal()),
    onUpdateReduxProjectTitle: title => dispatch(setProjectTitle(title))
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
    ProjectSaverHOC,
    vmListenerHOC,
    vmManagerHOC,
    nwCliProjectOpenerHOC,
    cloudManagerHOC
)(ConnectedGUI);

WrappedGui.setAppElement = ReactModal.setAppElement;
export default WrappedGui;
