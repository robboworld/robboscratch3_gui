import bindAll from 'lodash.bindall';
import bowser from 'bowser';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {defineMessages, injectIntl, intlShape} from 'react-intl';

import {saveProjectThunk} from '../../lib/project-save-actions';
import {
    clearTransientButtonFeedbackTimer,
    isTransientButtonFeedbackActive,
    showTransientButtonFeedback
} from '../../lib/transient-button-feedback';

import styles from './project-save-button.css';

const FEEDBACK_KEY = 'savedFeedback';

const messages = defineMessages({
    save: {
        id: 'gui.menuBar.saveButton.save',
        defaultMessage: 'Save ({shortcut})',
        description: 'Menu bar save button: action and its keyboard shortcut'
    },
    saving: {
        id: 'gui.menuBar.saveButton.saving',
        defaultMessage: 'Saving…',
        description: 'Menu bar save button: the project is being saved'
    },
    saved: {
        id: 'gui.menuBar.saveButton.saved',
        defaultMessage: 'Saved',
        description: 'Menu bar save button: shown for a moment after saving'
    },
    error: {
        id: 'gui.menuBar.saveButton.error',
        defaultMessage: 'Could not save. Try "Save as…" in the File menu',
        description: 'Menu bar save button: the last save failed'
    },
    savedToFile: {
        id: 'gui.menuBar.saveButton.savedToFile',
        defaultMessage: 'Saved to {name} at {time}',
        description: 'Menu bar save button tooltip: file name and time of the last save'
    },
    savedToComputer: {
        id: 'gui.menuBar.saveButton.savedToComputer',
        defaultMessage: 'Saved to the computer at {time}',
        description: 'Menu bar save button tooltip: project downloaded, file name unknown'
    },
    savedToCloud: {
        id: 'gui.menuBar.saveButton.savedToCloud',
        defaultMessage: 'Saved to Robbo Account at {time}',
        description: 'Menu bar save button tooltip: time of the last cloud save'
    },
    targetFile: {
        id: 'gui.menuBar.saveButton.targetFile',
        defaultMessage: 'File: {name}',
        description: 'Menu bar save button tooltip: the file the project is saved to'
    },
    targetCloud: {
        id: 'gui.menuBar.saveButton.targetCloud',
        defaultMessage: 'Project in Robbo Account',
        description: 'Menu bar save button tooltip: the project is saved to the personal account'
    },
    unsaved: {
        id: 'gui.menuBar.saveButton.unsaved',
        defaultMessage: 'Some changes are not saved to the file',
        description: 'Menu bar save button tooltip: project has unsaved changes'
    },
    notSavedYet: {
        id: 'gui.menuBar.saveButton.notSavedYet',
        defaultMessage: 'The project is not saved to a file yet',
        description: 'Menu bar save button tooltip: project has never been saved to a file'
    },
    draftSaved: {
        id: 'gui.menuBar.saveButton.draftSaved',
        defaultMessage: 'Draft kept in the app at {time}: it opens after a restart',
        description: 'Menu bar save button tooltip: time of the last automatic draft save'
    },
    draftError: {
        id: 'gui.menuBar.saveButton.draftError',
        defaultMessage: 'Could not keep a draft in the app. Save the project to a file',
        description: 'Menu bar save button tooltip: automatic draft save failed'
    }
});

const saveShortcutLabel = () => (bowser.mac ? '⌘S' : 'Ctrl+S');

/**
 * Save button in the menu bar: shows whether the project is saved and saves it on click (as Ctrl+S).
 * After a save the icon turns into a check mark for a moment, like the "Copy" button in About.
 */
class ProjectSaveButton extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleClick'
        ]);
        this.state = {
            [FEEDBACK_KEY]: null
        };
    }
    componentDidUpdate (prevProps) {
        if (this.props.fileSavedAt && this.props.fileSavedAt !== prevProps.fileSavedAt) {
            showTransientButtonFeedback(this, {stateKey: FEEDBACK_KEY});
        }
    }
    componentWillUnmount () {
        clearTransientButtonFeedbackTimer(this, FEEDBACK_KEY);
    }
    handleClick () {
        this.props.onSave();
    }
    formatTime (time) {
        return this.props.intl.formatTime(time, {hour: '2-digit', minute: '2-digit'});
    }
    getTooltipLines (justSaved) {
        const {
            draftError,
            draftSavedAt,
            fileError,
            fileSavedAt,
            intl,
            isSavingFile,
            projectChanged,
            targetKind,
            targetName
        } = this.props;
        const lines = [];
        if (isSavingFile) {
            lines.push(intl.formatMessage(messages.saving));
        } else if (justSaved) {
            lines.push(intl.formatMessage(messages.saved));
        } else {
            lines.push(intl.formatMessage(messages.save, {shortcut: saveShortcutLabel()}));
        }
        if (fileError) {
            lines.push(intl.formatMessage(messages.error));
        }

        if (fileSavedAt) {
            const time = this.formatTime(fileSavedAt);
            if (targetKind === 'cloud') {
                lines.push(intl.formatMessage(messages.savedToCloud, {time}));
            } else if (targetName) {
                lines.push(intl.formatMessage(messages.savedToFile, {name: targetName, time}));
            } else {
                lines.push(intl.formatMessage(messages.savedToComputer, {time}));
            }
        } else if (targetKind === 'cloud') {
            lines.push(intl.formatMessage(messages.targetCloud));
        } else if (targetName) {
            lines.push(intl.formatMessage(messages.targetFile, {name: targetName}));
        } else {
            lines.push(intl.formatMessage(messages.notSavedYet));
        }
        if (projectChanged && (fileSavedAt || targetKind)) {
            lines.push(intl.formatMessage(messages.unsaved));
        }

        if (draftError) {
            lines.push(intl.formatMessage(messages.draftError));
        } else if (draftSavedAt) {
            lines.push(intl.formatMessage(messages.draftSaved, {time: this.formatTime(draftSavedAt)}));
        }
        return lines;
    }
    render () {
        const {
            draftError,
            fileError,
            isSavingFile,
            projectChanged
        } = this.props;
        const justSaved = isTransientButtonFeedbackActive(this.state, FEEDBACK_KEY) && !isSavingFile;
        const hasError = !isSavingFile && !justSaved && (fileError || draftError);
        const lines = this.getTooltipLines(justSaved);
        return (
            <button
                aria-label={lines[0]}
                className={classNames(styles.saveButton, {
                    [styles.saving]: isSavingFile,
                    [styles.done]: justSaved
                })}
                id="menu-bar-save-button"
                title={lines.join('\n')}
                type="button"
                onClick={this.handleClick}
            >
                {justSaved ? (
                    <svg
                        aria-hidden="true"
                        className={styles.icon}
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                    >
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                ) : (
                    <svg
                        aria-hidden="true"
                        className={styles.icon}
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                    >
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                    </svg>
                )}
                {hasError ? (
                    <span
                        aria-hidden="true"
                        className={classNames(styles.badge, styles.errorBadge)}
                    />
                ) : null}
                {!hasError && !justSaved && !isSavingFile && projectChanged ? (
                    <span
                        aria-hidden="true"
                        className={classNames(styles.badge, styles.unsavedBadge)}
                    />
                ) : null}
            </button>
        );
    }
}

ProjectSaveButton.propTypes = {
    draftError: PropTypes.bool,
    draftSavedAt: PropTypes.number,
    fileError: PropTypes.bool,
    fileSavedAt: PropTypes.number,
    intl: intlShape.isRequired,
    isSavingFile: PropTypes.bool,
    onSave: PropTypes.func.isRequired,
    projectChanged: PropTypes.bool,
    targetKind: PropTypes.string,
    targetName: PropTypes.string
};

const mapStateToProps = state => {
    const status = state.scratchGui.projectSaveStatus;
    return {
        draftError: status.draftError,
        draftSavedAt: status.draftSavedAt,
        fileError: status.fileError,
        fileSavedAt: status.fileSavedAt,
        isSavingFile: status.isSavingFile,
        projectChanged: state.scratchGui.projectChanged,
        targetKind: status.targetKind,
        targetName: status.targetName
    };
};

const mapDispatchToProps = dispatch => ({
    onSave: () => dispatch(saveProjectThunk({saveAs: false}))
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(ProjectSaveButton));
