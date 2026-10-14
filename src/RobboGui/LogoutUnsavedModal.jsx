import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import {defineMessages, injectIntl, intlShape} from 'react-intl';

import styles from './LogoutUnsavedModal.css';

const messages = defineMessages({
    title: {
        id: 'gui.logoutUnsaved.title',
        defaultMessage: 'Unsaved changes',
        description: 'Title for unsaved changes confirmation modal'
    },
    messageLogout: {
        id: 'gui.logoutUnsaved.message',
        defaultMessage: 'Save your changes to your personal account before signing out.',
        description: 'Body text when leaving via sign out'
    },
    hintLogout: {
        id: 'gui.logoutUnsaved.hint',
        defaultMessage: 'Unsaved changes will be lost if you sign out.',
        description: 'Secondary hint when leaving via sign out'
    },
    messageProjectPage: {
        id: 'gui.logoutUnsaved.messageProjectPage',
        defaultMessage: 'Save your changes before opening the project page in your account.',
        description: 'Body text when navigating to LK project page'
    },
    hintProjectPage: {
        id: 'gui.logoutUnsaved.hintProjectPage',
        defaultMessage: 'Unsaved changes will not appear on the project page.',
        description: 'Secondary hint when navigating to LK project page'
    },
    projectLabel: {
        id: 'gui.logoutUnsaved.projectLabel',
        defaultMessage: 'Current project',
        description: 'Label above project title in unsaved modal'
    },
    unnamedProject: {
        id: 'gui.logoutUnsaved.unnamedProject',
        defaultMessage: 'Untitled project',
        description: 'Fallback project title in unsaved modal'
    },
    save: {
        id: 'gui.logoutUnsaved.save',
        defaultMessage: 'Save to account',
        description: 'Save project to personal account'
    },
    discardLogout: {
        id: 'gui.logoutUnsaved.discard',
        defaultMessage: 'Sign out without saving',
        description: 'Discard unsaved project and sign out'
    },
    discardProjectPage: {
        id: 'gui.logoutUnsaved.discardProjectPage',
        defaultMessage: 'Open without saving',
        description: 'Open project page without saving'
    },
    cancel: {
        id: 'gui.logoutUnsaved.cancel',
        defaultMessage: 'Stay in editor',
        description: 'Cancel leaving the editor'
    },
    saving: {
        id: 'gui.logoutUnsaved.saving',
        defaultMessage: 'Saving…',
        description: 'Shown while saving'
    },
    saveFailedLogout: {
        id: 'gui.logoutUnsaved.saveFailed',
        defaultMessage: 'Could not save the changes. Try again or sign out without saving.',
        description: 'Shown when save-before-logout fails'
    },
    saveFailedProjectPage: {
        id: 'gui.logoutUnsaved.saveFailedProjectPage',
        defaultMessage: 'Could not save the changes. Try again or open without saving.',
        description: 'Shown when save-before-project-page fails'
    },
    close: {
        id: 'gui.logoutUnsaved.close',
        defaultMessage: 'Close',
        description: 'Close unsaved modal'
    }
});

function BlocksIllustration () {
    return (
        <svg
            className={styles.illustration}
            viewBox="0 0 88 68"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <rect x="4" y="8" width="52" height="16" rx="4" fill="#FFAB19" />
            <rect x="12" y="12" width="18" height="8" rx="2" fill="#FFC96B" />
            <rect x="8" y="30" width="72" height="16" rx="4" fill="#00AF41" />
            <rect x="16" y="34" width="28" height="8" rx="2" fill="#4FD47E" />
            <rect x="20" y="52" width="44" height="14" rx="4" fill="#4C97FF" />
            <rect x="28" y="56" width="16" height="6" rx="2" fill="#7EB3FF" />
        </svg>
    );
}

function LogoutUnsavedModal (props) {
    const {
        intl,
        isOpen,
        isSaving,
        saveFailed,
        projectTitle,
        variant,
        onCancel,
        onDiscard,
        onSave
    } = props;

    if (!isOpen || typeof document === 'undefined' || !document.body) {
        return null;
    }

    const isProjectPage = variant === 'projectPage';
    const displayTitle = (projectTitle || '').trim() ||
        intl.formatMessage(messages.unnamedProject);

    const handleOverlayMouseDown = event => {
        if (event.target === event.currentTarget && !isSaving) {
            onCancel();
        }
    };

    return ReactDOM.createPortal(
        <div
            className={styles.overlay}
            role="presentation"
            onMouseDown={handleOverlayMouseDown}
        >
            <div
                className={styles.panel}
                role="dialog"
                aria-modal="true"
                aria-labelledby="logout-unsaved-title"
                aria-describedby="logout-unsaved-message"
            >
                <div className={styles.header}>
                    <span
                        className={styles.headerIcon}
                        aria-hidden="true"
                    />
                    <h2
                        id="logout-unsaved-title"
                        className={styles.headerTitle}
                    >
                        {intl.formatMessage(messages.title)}
                    </h2>
                    <button
                        type="button"
                        className={styles.closeButton}
                        aria-label={intl.formatMessage(messages.close)}
                        disabled={isSaving}
                        onClick={onCancel}
                    />
                </div>

                <div className={styles.body}>
                    <div className={styles.hero}>
                        <BlocksIllustration />
                        <p
                            id="logout-unsaved-message"
                            className={styles.message}
                        >
                            {intl.formatMessage(isProjectPage ?
                                messages.messageProjectPage :
                                messages.messageLogout)}
                        </p>
                        <p className={styles.hint}>
                            {intl.formatMessage(isProjectPage ?
                                messages.hintProjectPage :
                                messages.hintLogout)}
                        </p>
                    </div>

                    <div className={styles.projectCard}>
                        <div
                            className={styles.projectIcon}
                            aria-hidden="true"
                        />
                        <div className={styles.projectMeta}>
                            <span className={styles.projectLabel}>
                                {intl.formatMessage(messages.projectLabel)}
                            </span>
                            <p
                                className={styles.projectTitle}
                                title={displayTitle}
                            >
                                {displayTitle}
                            </p>
                        </div>
                    </div>

                    {saveFailed ? (
                        <div
                            className={styles.errorBox}
                            role="alert"
                        >
                            <p className={styles.errorText}>
                                {intl.formatMessage(isProjectPage ?
                                    messages.saveFailedProjectPage :
                                    messages.saveFailedLogout)}
                            </p>
                        </div>
                    ) : null}
                </div>

                <div className={styles.footer}>
                    <button
                        type="button"
                        className={styles.primaryButton}
                        disabled={isSaving}
                        onClick={onSave}
                    >
                        <span className={styles.buttonContent}>
                            {isSaving ? (
                                <span
                                    className={styles.spinner}
                                    aria-hidden="true"
                                />
                            ) : null}
                            {isSaving ?
                                intl.formatMessage(messages.saving) :
                                intl.formatMessage(messages.save)}
                        </span>
                    </button>
                    <button
                        type="button"
                        className={styles.dangerButton}
                        disabled={isSaving}
                        onClick={onDiscard}
                    >
                        {intl.formatMessage(isProjectPage ?
                            messages.discardProjectPage :
                            messages.discardLogout)}
                    </button>
                    <button
                        type="button"
                        className={styles.cancelLink}
                        disabled={isSaving}
                        onClick={onCancel}
                    >
                        {intl.formatMessage(messages.cancel)}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

LogoutUnsavedModal.propTypes = {
    intl: intlShape,
    isOpen: PropTypes.bool,
    isSaving: PropTypes.bool,
    saveFailed: PropTypes.bool,
    projectTitle: PropTypes.string,
    variant: PropTypes.oneOf(['logout', 'projectPage']),
    onCancel: PropTypes.func,
    onDiscard: PropTypes.func,
    onSave: PropTypes.func
};

LogoutUnsavedModal.defaultProps = {
    variant: 'logout'
};

export default injectIntl(LogoutUnsavedModal);
