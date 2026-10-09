import log from './log';
import {saveProjectAs, saveProjectToFile} from './project-file-save-gateway';
import {getProjectSaveTarget} from './project-save-target';
import {projectTitleInitialState} from '../reducers/project-title';
import {setProjectUnchanged} from '../reducers/project-changed';
import {
    fileSaveCancelled,
    fileSaveFailed,
    fileSaveSucceeded,
    startFileSave
} from '../reducers/project-save-status';
import {saveToCloudThunk} from '../RobboGui/actions/robboAccountActions';

const getProjectFilename = (curTitle, defaultTitle) => {
    let filenameTitle = curTitle;
    if (!filenameTitle || filenameTitle.length === 0) {
        filenameTitle = defaultTitle;
    }
    return `${filenameTitle.substring(0, 100)}.sb3`;
};

// One save at a time: Ctrl+S held or pressed twice must not open two dialogs.
let isSaving = false;

/**
 * Save the project: "Save" (Ctrl+S) writes to the current file or cloud project,
 * "Save as" (Ctrl+Shift+S) always asks for a location.
 * @param {{saveAs: boolean}} options saveAs — always ask for a location
 * @returns {function} redux thunk resolving with the save result (or undefined on error)
 */
const saveProjectThunk = options => (dispatch, getState) => {
    const saveAs = !!(options && options.saveAs);
    if (isSaving) {
        return Promise.resolve();
    }
    const gui = getState().scratchGui;
    const target = getProjectSaveTarget();
    if (!saveAs && target && target.kind === 'cloud') {
        return dispatch(saveToCloudThunk({asCopy: false}));
    }

    const vm = gui.vm;
    const filename = getProjectFilename(gui.projectTitle, projectTitleInitialState);
    // Called after the location dialog (if any) closes: "Saving…" is not shown while the user picks a file.
    const getBlob = () => {
        dispatch(startFileSave());
        return vm.saveProjectSb3();
    };

    isSaving = true;
    return (saveAs ? saveProjectAs({filename, getBlob}) : saveProjectToFile({filename, getBlob}))
        .then(result => {
            if (!result || result.method === 'aborted') {
                dispatch(fileSaveCancelled());
                return result;
            }
            dispatch(setProjectUnchanged());
            dispatch(fileSaveSucceeded(Date.now()));
            return result;
        })
        .catch(error => {
            log.error('Project save failed', error);
            dispatch(fileSaveFailed());
        })
        .then(result => {
            isSaving = false;
            return result;
        });
};

export {
    getProjectFilename,
    saveProjectThunk
};
