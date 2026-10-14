import classNames from 'classnames';
import React from 'react';
import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';

import {
    clearTransientButtonFeedbackTimer,
    isTransientButtonFeedbackActive,
    showTransientButtonFeedback
} from '../../lib/transient-button-feedback';
import {
    getSaveStatusTitle,
    mapStatusStateToProps,
    messages,
    statusPropTypes
} from '../../lib/project-save-status-text';

import styles from './file-menu-save.css';

const FEEDBACK_KEY = 'savedFeedback';

/**
 * Mark on the "File" menu button: white dot — changes not saved to a file, pulsing — saving,
 * check mark for a moment after saving (like the "Copy" button in About), orange — error.
 */
class FileMenuSaveMarkComponent extends React.Component {
    constructor (props) {
        super(props);
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
    render () {
        const {draftError, fileError, intl, isSavingFile, projectChanged} = this.props;
        const justSaved = isTransientButtonFeedbackActive(this.state, FEEDBACK_KEY) && !isSavingFile;
        const hasError = !isSavingFile && !justSaved && (fileError || draftError);
        const title = getSaveStatusTitle(intl, this.props, projectChanged);
        if (justSaved) {
            return (
                <span
                    className={classNames(styles.mark, styles.savedMark)}
                    role="img"
                    aria-label={intl.formatMessage(messages.saved)}
                >
                    <svg
                        aria-hidden="true"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3.5"
                        viewBox="0 0 24 24"
                    >
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </span>
            );
        }
        if (isSavingFile) {
            return (
                <span
                    className={classNames(styles.mark, styles.savingMark)}
                    role="img"
                    aria-label={title}
                />
            );
        }
        if (hasError) {
            return (
                <span
                    className={classNames(styles.mark, styles.errorMark)}
                    role="img"
                    aria-label={title}
                />
            );
        }
        if (projectChanged) {
            return (
                <span
                    className={classNames(styles.mark, styles.unsavedMark)}
                    role="img"
                    aria-label={title}
                />
            );
        }
        return null;
    }
}

FileMenuSaveMarkComponent.propTypes = statusPropTypes;

export default injectIntl(connect(
    mapStatusStateToProps,
    () => ({})
)(FileMenuSaveMarkComponent));
