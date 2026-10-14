import {defineMessages} from 'react-intl';

import {robboConfirm} from '../RobboGui/RobboConfirmDialog';
import {saveProjectThunk} from './project-save-actions';

const messages = defineMessages({
    title: {
        id: 'gui.unsavedChanges.title',
        defaultMessage: 'Unsaved changes',
        description: 'Title of the question before replacing a project with unsaved changes'
    },
    message: {
        id: 'gui.unsavedChanges.message',
        defaultMessage: 'The project has changes that are not saved to a file. Save them before opening another project?', // eslint-disable-line max-len
        description: 'Question before New, opening a file or a scenario when the project has unsaved changes'
    },
    save: {
        id: 'gui.unsavedChanges.save',
        defaultMessage: 'Save',
        description: 'Button: save the project, then open the other one'
    },
    dontSave: {
        id: 'gui.unsavedChanges.dontSave',
        defaultMessage: 'Don\'t save',
        description: 'Button: discard the changes and open the other project'
    },
    cancel: {
        id: 'gui.unsavedChanges.cancel',
        defaultMessage: 'Cancel',
        description: 'Button: keep the current project open'
    }
});

/**
 * Before the open project is replaced (New, open a file or a scenario): when it has changes
 * not saved to a file, ask "Save" / "Don't save" / "Cancel".
 * @param {intlShape} intl react-intl object of the caller
 * @returns {function} redux thunk resolving true when the other project may be opened
 */
const confirmReplaceProject = intl => (dispatch, getState) => {
    if (!getState().scratchGui.projectChanged) {
        return Promise.resolve(true);
    }
    return robboConfirm({
        title: intl.formatMessage(messages.title),
        message: intl.formatMessage(messages.message),
        confirmLabel: intl.formatMessage(messages.save),
        alternativeLabel: intl.formatMessage(messages.dontSave),
        cancelLabel: intl.formatMessage(messages.cancel)
    }).then(answer => {
        if (answer === 'alternative') return true;
        if (answer !== true) return false;
        // Continue only when the project really was saved (not cancelled in the dialog, no error).
        return dispatch(saveProjectThunk({saveAs: false}))
            .then(result => !!result && result.method !== 'aborted');
    });
};

export default confirmReplaceProject;
