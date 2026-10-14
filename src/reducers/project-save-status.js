/**
 * Save status for the menu bar save button: session draft (IndexedDB autosave)
 * and the project file / cloud project that "Save" (Ctrl+S) writes to.
 */
const SET_DRAFT_SAVED = 'scratch-gui/project-save-status/SET_DRAFT_SAVED';
const SET_DRAFT_ERROR = 'scratch-gui/project-save-status/SET_DRAFT_ERROR';
const SET_SAVE_TARGET = 'scratch-gui/project-save-status/SET_SAVE_TARGET';
const FILE_SAVE_START = 'scratch-gui/project-save-status/FILE_SAVE_START';
const FILE_SAVE_SUCCESS = 'scratch-gui/project-save-status/FILE_SAVE_SUCCESS';
const FILE_SAVE_FAILURE = 'scratch-gui/project-save-status/FILE_SAVE_FAILURE';
const FILE_SAVE_CANCEL = 'scratch-gui/project-save-status/FILE_SAVE_CANCEL';
const SET_RESTORED_DRAFT = 'scratch-gui/project-save-status/SET_RESTORED_DRAFT';

const initialState = {
    /** Time of the last successful draft write (ms) or null. */
    draftSavedAt: null,
    draftError: false,
    /** Where "Save" writes: 'handle' | 'path' | 'cloud' | null (unknown → "Save as"). */
    targetKind: null,
    /** File name shown in the tooltip, e.g. "robot.sb3". */
    targetName: null,
    /** Time of the last successful save to file / cloud (ms) or null. */
    fileSavedAt: null,
    isSavingFile: false,
    fileError: false,
    /** Session draft opened at start: {title, savedAt} for the notice under the save button, or null. */
    restoredDraft: null
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SET_DRAFT_SAVED:
        return Object.assign({}, state, {
            draftSavedAt: action.time,
            draftError: false
        });
    case SET_DRAFT_ERROR:
        return Object.assign({}, state, {
            draftError: true
        });
    case SET_SAVE_TARGET:
        return Object.assign({}, state, {
            targetKind: action.kind || null,
            targetName: action.name || null,
            // A different project was opened: the old save time no longer applies.
            fileSavedAt: null,
            fileError: false
        });
    case FILE_SAVE_START:
        return Object.assign({}, state, {
            isSavingFile: true,
            fileError: false
        });
    case FILE_SAVE_SUCCESS:
        return Object.assign({}, state, {
            isSavingFile: false,
            fileError: false,
            fileSavedAt: action.time
        });
    case FILE_SAVE_FAILURE:
        return Object.assign({}, state, {
            isSavingFile: false,
            fileError: true
        });
    case SET_RESTORED_DRAFT:
        return Object.assign({}, state, {
            restoredDraft: action.draft || null
        });
    case FILE_SAVE_CANCEL:
        return Object.assign({}, state, {
            isSavingFile: false
        });
    default:
        return state;
    }
};

const setDraftSaved = time => ({
    type: SET_DRAFT_SAVED,
    time
});

const setDraftError = () => ({
    type: SET_DRAFT_ERROR
});

const setSaveTarget = target => ({
    type: SET_SAVE_TARGET,
    kind: target ? target.kind : null,
    name: target ? target.name : null
});

const startFileSave = () => ({
    type: FILE_SAVE_START
});

const fileSaveSucceeded = time => ({
    type: FILE_SAVE_SUCCESS,
    time
});

const fileSaveFailed = () => ({
    type: FILE_SAVE_FAILURE
});

const fileSaveCancelled = () => ({
    type: FILE_SAVE_CANCEL
});

const setRestoredDraft = draft => ({
    type: SET_RESTORED_DRAFT,
    draft
});

export {
    reducer as default,
    initialState as projectSaveStatusInitialState,
    fileSaveCancelled,
    fileSaveFailed,
    fileSaveSucceeded,
    setDraftError,
    setDraftSaved,
    setRestoredDraft,
    setSaveTarget,
    startFileSave
};
