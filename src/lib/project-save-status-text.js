import bowser from 'bowser';
import PropTypes from 'prop-types';
import {defineMessages, intlShape} from 'react-intl';

import {fileMenuOpen} from '../reducers/menus';

/*
 * Save status texts for the "File" menu: the tooltip and mark on the menu button and the
 * "draft opened" notice (components/menu-bar/file-menu-*.jsx).
 */

const messages = defineMessages({
    saving: {
        id: 'gui.menuBar.saveStatus.saving',
        defaultMessage: 'Saving…',
        description: 'File menu tooltip: the project is being saved'
    },
    saved: {
        id: 'gui.menuBar.saveStatus.saved',
        defaultMessage: 'Saved',
        description: 'File menu mark: shown for a moment after saving'
    },
    error: {
        id: 'gui.menuBar.saveStatus.error',
        defaultMessage: 'Could not save',
        description: 'File menu tooltip: the last save failed'
    },
    savedAt: {
        id: 'gui.menuBar.saveStatus.savedAt',
        defaultMessage: '{name} — saved at {time}',
        description: 'File menu tooltip: file (or Robbo Account) and time of the last save'
    },
    savedAtUnnamed: {
        id: 'gui.menuBar.saveStatus.savedAtUnnamed',
        defaultMessage: 'Saved at {time}',
        description: 'File menu tooltip: project downloaded, file name unknown'
    },
    unsaved: {
        id: 'gui.menuBar.saveStatus.unsaved',
        defaultMessage: '{name} — not saved',
        description: 'File menu tooltip: file (or Robbo Account) has unsaved changes'
    },
    noChanges: {
        id: 'gui.menuBar.saveStatus.noChanges',
        defaultMessage: '{name} — no changes',
        description: 'File menu tooltip: opened file, nothing changed yet'
    },
    notSavedYet: {
        id: 'gui.menuBar.saveStatus.notSavedYet',
        defaultMessage: 'Not saved to a file',
        description: 'File menu tooltip: project has never been saved to a file'
    },
    cloudName: {
        id: 'gui.menuBar.saveStatus.cloudName',
        defaultMessage: 'Robbo Account',
        description: 'File menu tooltip: name used instead of a file name for a cloud project'
    },
    draftError: {
        id: 'gui.menuBar.saveStatus.draftError',
        defaultMessage: 'Autosave does not work',
        description: 'File menu tooltip: automatic draft save failed'
    },
    targetFile: {
        id: 'gui.menuBar.saveStatus.targetFile',
        defaultMessage: 'File: {name}',
        description: 'Notice at start: the file the restored draft is saved to'
    },
    restoredDraft: {
        id: 'gui.menuBar.saveStatus.restoredDraft',
        defaultMessage: 'Opened the draft "{title}" from {time}',
        description: 'Notice at start: the session draft was opened instead of an empty project'
    },
    restoredDraftUntitled: {
        id: 'gui.menuBar.saveStatus.restoredDraftUntitled',
        defaultMessage: 'Opened the draft from {time}',
        description: 'Notice at start: the session draft (without a title) was opened'
    },
    restoredDraftHint: {
        id: 'gui.menuBar.saveStatus.restoredDraftHint',
        defaultMessage: 'It has changes that are not saved to a file. To save them, press {shortcut}.',
        description: 'Notice at start: the restored draft has unsaved changes and how to save them'
    },
    closeNotice: {
        id: 'gui.menuBar.saveStatus.closeNotice',
        defaultMessage: 'Close',
        description: 'Close button of the notice under the File menu'
    }
});

const saveShortcutLabel = () => (bowser.mac ? '⌘S' : 'Ctrl+S');

const formatTime = (intl, time) => intl.formatTime(time, {hour: '2-digit', minute: '2-digit'});

const formatDateTime = (intl, time) => {
    const sameDay = new Date(time).toDateString() === new Date().toDateString();
    if (sameDay) return formatTime(intl, time);
    return intl.formatDate(time, {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Short tooltip of the "File" menu button: one line about the file, one more on an error.
 * @param {intlShape} intl react-intl object
 * @param {object} status projectSaveStatus state
 * @param {boolean} projectChanged changes not saved to a file
 * @returns {string} tooltip text
 */
const getSaveStatusTitle = (intl, status, projectChanged) => {
    const {draftError, fileError, fileSavedAt, isSavingFile, targetKind, targetName} = status;
    const name = targetKind === 'cloud' ? intl.formatMessage(messages.cloudName) : targetName;
    let line;
    if (isSavingFile) {
        line = intl.formatMessage(messages.saving);
    } else if (fileError) {
        line = intl.formatMessage(messages.error);
    } else if (projectChanged) {
        line = name ?
            intl.formatMessage(messages.unsaved, {name}) :
            intl.formatMessage(messages.notSavedYet);
    } else if (fileSavedAt) {
        const time = formatTime(intl, fileSavedAt);
        line = name ?
            intl.formatMessage(messages.savedAt, {name, time}) :
            intl.formatMessage(messages.savedAtUnnamed, {time});
    } else if (name) {
        line = intl.formatMessage(messages.noChanges, {name});
    } else {
        line = intl.formatMessage(messages.notSavedYet);
    }
    return draftError ? `${line}\n${intl.formatMessage(messages.draftError)}` : line;
};

// Props are read inside getSaveStatusTitle(), which the lint rule cannot follow.
/* eslint-disable react/no-unused-prop-types */
const statusPropTypes = {
    draftError: PropTypes.bool,
    draftSavedAt: PropTypes.number,
    fileError: PropTypes.bool,
    fileSavedAt: PropTypes.number,
    intl: intlShape.isRequired,
    isSavingFile: PropTypes.bool,
    projectChanged: PropTypes.bool,
    targetKind: PropTypes.string,
    targetName: PropTypes.string
};
/* eslint-enable react/no-unused-prop-types */

const mapStatusStateToProps = state => {
    const status = state.scratchGui.projectSaveStatus;
    return {
        draftError: status.draftError,
        draftSavedAt: status.draftSavedAt,
        fileError: status.fileError,
        fileSavedAt: status.fileSavedAt,
        isFileMenuOpen: fileMenuOpen(state),
        isSavingFile: status.isSavingFile,
        projectChanged: state.scratchGui.projectChanged,
        restoredDraft: status.restoredDraft,
        targetKind: status.targetKind,
        targetName: status.targetName
    };
};

export {
    formatDateTime,
    getSaveStatusTitle,
    mapStatusStateToProps,
    messages,
    saveShortcutLabel,
    statusPropTypes
};
