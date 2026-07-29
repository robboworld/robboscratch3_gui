import classNames from 'classnames';
import {connect} from 'react-redux';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import bowser from 'bowser';
import React from 'react';

import Box from '../box/box.jsx';
import Button from '../button/button.jsx';
import CommunityButton from './community-button.jsx';
import ShareButton from './share-button.jsx';
import {ComingSoonTooltip} from '../coming-soon/coming-soon.jsx';
import Divider from '../divider/divider.jsx';
import LanguageSelector from '../../containers/language-selector.jsx';
import SaveStatus from './save-status.jsx';
import SBFileUploader from '../../containers/sb-file-uploader.jsx';
import ProjectWatcher from '../../containers/project-watcher.jsx';
import MenuBarMenu from './menu-bar-menu.jsx';
import {MenuItem, MenuSection} from '../menu/menu.jsx';
import ProjectTitleInput from './project-title-input.jsx';
import AuthorInfo from './author-info.jsx';
import AccountNav from '../../containers/account-nav.jsx';
import LoginDropdown from './login-dropdown.jsx';
import RobboLoginForm from './robbo-login-form.jsx';
import SB3Downloader from '../../containers/sb3-downloader.jsx';
import DeletionRestorer from '../../containers/deletion-restorer.jsx';
import TurboMode from '../../containers/turbo-mode.jsx';

import {openTipsLibrary, openScenariosLibrary} from '../../reducers/modals';
import {setPlayer} from '../../reducers/mode';
import {
    autoUpdateProject,
    getIsUpdating,
    getIsShowingProject,
    manualUpdateProject,
    requestNewProject,
    remixProject,
    saveProjectAsCopy
} from '../../reducers/project-state';
import {
    openAccountMenu,
    closeAccountMenu,
    accountMenuOpen,
    openFileMenu,
    closeFileMenu,
    fileMenuOpen,
    openEditMenu,
    closeEditMenu,
    editMenuOpen,
    closeLanguageMenu,
    openLanguageMenu,
    languageMenuOpen,
    openLoginMenu,
    closeLoginMenu,
    loginMenuOpen
} from '../../reducers/menus';

import styles from './menu-bar.css';

import helpIcon from '../../lib/assets/icon--tutorials.svg';
import mystuffIcon from './icon--mystuff.png';
import feedbackIcon from './icon--feedback.svg';
import profileIcon from './icon--account.svg';
import remixIcon from './icon--remix.svg';
import dropdownCaret from './dropdown-caret.svg';
import fileIcon from './icon--file.svg';
import editIcon from './icon--edit.svg';
import robboScratchIcon from './icon--robboscratch3.png';
import languageIcon from '../language-selector/language-icon.svg';
import languageSelectorStyles from '../language-selector/language-selector.css';

import {ActionTriggerRobboMenu} from '../../RobboGui/actions/sensor_actions.js'; //Robbo //modified_by_Yaroslav
import MenuBarDeviceControls from '../../RobboGui/MenuBarDeviceControls';
import {setRobboUiHidden} from '../../reducers/layout-visibility';
import storage from '../../lib/storage';
import {
    checkSessionThunk,
    saveToCloudThunk,
    signOutThunk,
    updateCloudProjectTitleThunk
} from '../../RobboGui/actions/robboAccountActions';
import {
    myProjectsUrl,
    projectPageUrl,
    resolveLkBase
} from '../../lib/robbo-account/robboAccountConfig';

const navigateTop = url => {
    try {
        if (typeof window !== 'undefined' && window.top && window.top !== window) {
            window.top.location.href = url;
            return;
        }
    } catch (e) { /* cross-origin top — fall through */ }
    if (typeof window !== 'undefined') {
        window.location.href = url;
    }
};

const messages = defineMessages({
    showRobboUi: {
        id: 'gui.menuBar.show_robbo_ui',
        description: 'Menu bar button to show ROBBO interface',
        defaultMessage: 'Show ROBBO'
    },
    hideRobboUi: {
        id: 'gui.menuBar.hide_robbo_ui',
        description: 'Menu bar button to hide ROBBO interface',
        defaultMessage: 'Hide ROBBO'
    },
    confirmNav: {
        id: 'gui.menuBar.confirmNewWithoutSaving',
        defaultMessage: 'Replace contents of the current project?',
        description: 'message for prompting user to confirm that they want to create new project without saving'
    },
     new_project: {
        id: 'gui.menuBar.new_project',
        defaultMessage: 'Новый проект',
        description: ''
    },
    signIn: {
        id: 'gui.menuBar.robboSignIn',
        defaultMessage: 'Sign in',
        description: 'Menu bar link to sign in to Robbo account'
    },
    myStuff: {
        id: 'gui.menuBar.robboMyStuff',
        defaultMessage: 'My Stuff',
        description: 'Menu bar link to personal account project list'
    },
    accountHome: {
        id: 'gui.menuBar.robboAccountHome',
        defaultMessage: 'Account',
        description: 'Menu bar link to personal account home'
    },
    signOut: {
        id: 'gui.menuBar.robboSignOut',
        defaultMessage: 'Sign out',
        description: 'Menu bar sign out action'
    },
    saveToCloud: {
        id: 'gui.menuBar.robboSaveToCloud',
        defaultMessage: 'Save to Robbo Account',
        description: 'File menu: save current project to personal account'
    },
    saveAsCloudCopy: {
        id: 'gui.menuBar.robboSaveAsCloudCopy',
        defaultMessage: 'Save as a copy to Robbo Account',
        description: 'File menu: save a new copy to personal account'
    },
    savingToCloud: {
        id: 'gui.menuBar.robboSavingToCloud',
        defaultMessage: 'Saving…',
        description: 'Shown while cloud save is in progress'
    },
    savedToCloud: {
        id: 'gui.menuBar.robboSavedToCloud',
        defaultMessage: 'Saved',
        description: 'Shown after successful cloud save'
    },
    saveToCloudError: {
        id: 'gui.menuBar.robboSaveToCloudError',
        defaultMessage: 'Save failed',
        description: 'Shown when cloud save fails'
    }
});
const ariaMessages = defineMessages({
    language: {
        id: 'gui.menuBar.LanguageSelector',
        defaultMessage: 'language selector',
        description: 'accessibility text for the language selection menu'
    },
    tutorials: {
        id: 'gui.menuBar.tutorialsLibrary',
        defaultMessage: 'Tutorials',
        description: 'accessibility text for the tutorials button'
    }
});

const MenuBarItemTooltip = ({
    children,
    className,
    enable,
    id,
    place = 'bottom'
}) => {
    if (enable) {
        return (
            <React.Fragment>
                {children}
            </React.Fragment>
        );
    }
    return (
        <ComingSoonTooltip
            className={classNames(styles.comingSoon, className)}
            place={place}
            tooltipClassName={styles.comingSoonTooltip}
            tooltipId={id}
        >
            {children}
        </ComingSoonTooltip>
    );
};


MenuBarItemTooltip.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    enable: PropTypes.bool,
    id: PropTypes.string,
    place: PropTypes.oneOf(['top', 'bottom', 'left', 'right'])
};

const MenuItemTooltip = ({id, isRtl, children, className}) => (
    <ComingSoonTooltip
        className={classNames(styles.comingSoon, className)}
        isRtl={isRtl}
        place={isRtl ? 'left' : 'right'}
        tooltipClassName={styles.comingSoonTooltip}
        tooltipId={id}
    >
        {children}
    </ComingSoonTooltip>
);

MenuItemTooltip.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    id: PropTypes.string,
    isRtl: PropTypes.bool
};

class MenuBar extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleClickNew',
            'handleClickRemix',
            'handleClickSave',
            'handleClickSaveAsCopy',
            'handleClickSeeCommunity',
            'handleClickShare',
            'handleCloseFileMenuAndThen',
            'handleKeyPress',
            'handleRestoreOption',
            'restoreOptionMessage',
            'handleClickSignOut',
            'handleClickMyStuff',
            'handleClickAccountHome',
            'handleClickSeeProjectPage',
            'handleClickSaveToCloud',
            'handleClickSaveAsCloudCopy',
            'handleUpdateCloudProjectTitle'
        ]);
    }
    componentDidMount () {
        document.addEventListener('keydown', this.handleKeyPress);
        if (this.props.onCheckSession) {
            this.props.onCheckSession();
        }
    }
    componentWillUnmount () {
        document.removeEventListener('keydown', this.handleKeyPress);
    }
    handleClickSignOut () {
        if (this.props.onSignOut) {
            this.props.onSignOut();
        }
    }
    handleClickMyStuff () {
        navigateTop(myProjectsUrl());
    }
    handleClickAccountHome () {
        navigateTop(`${resolveLkBase()}/home`);
    }
    handleClickSeeProjectPage () {
        const id = this.props.cloudProjectPageId;
        if (id) {
            navigateTop(projectPageUrl(id));
        }
    }
    handleClickSaveToCloud () {
        this.props.onRequestCloseFile();
        if (this.props.onSaveToCloud) {
            this.props.onSaveToCloud({asCopy: false});
        }
    }
    handleClickSaveAsCloudCopy () {
        this.props.onRequestCloseFile();
        if (this.props.onSaveToCloud) {
            this.props.onSaveToCloud({asCopy: true});
        }
    }
    handleUpdateCloudProjectTitle (newTitle) {
        if (this.props.onUpdateCloudProjectTitle) {
            this.props.onUpdateCloudProjectTitle(newTitle);
        } else if (this.props.onUpdateProjectTitle) {
            this.props.onUpdateProjectTitle(newTitle);
        }
    }
    handleClickNew () {
        // let readyToReplaceProject = true;
        // // if the project is dirty, and user owns the project, we will autosave.
        // // but if they are not logged in and can't save, user should consider
        // // downloading or logging in first.
        // // Note that if user is logged in and editing someone else's project,
        // // they'll lose their work.
        // if (this.props.projectChanged && !this.props.canCreateNew) {
        //     readyToReplaceProject = confirm( // eslint-disable-line no-alert
        //         this.props.intl.formatMessage(messages.confirmNav)
        //     );
        // }
        // this.props.onRequestCloseFile();
        // if (readyToReplaceProject) {
        //     //this.props.onClickNew(this.props.canSave && this.props.canCreateNew);
        //     this.props.onClickNew(false); //modified_by_Yaroslav
        // }
        // this.props.onRequestCloseFile();

    window.document.title = this.props.intl.formatMessage(messages.new_project);   
    
    storage
      .load(storage.AssetType.Project, 0, storage.DataFormat.JSON)
      .then((projectAsset) => {

        this.props.onRequestCloseFile();
        this.props.vm.loadProject(projectAsset.data);
      //  this.props.onRequestCloseFile();

      })
      .catch(err => console.error("Project load error: " + err));
    }

    handleClickRemix () {
        this.props.onClickRemix();
        this.props.onRequestCloseFile();
    }
    handleClickSave () {
        
        this.props.onClickSave();
        this.props.onRequestCloseFile();
    }
    handleClickSaveAsCopy () {
        this.props.onClickSaveAsCopy();
        this.props.onRequestCloseFile();
    }
    handleClickSeeCommunity (waitForUpdate) {
        if (this.props.canSave) { // save before transitioning to project page
            this.props.autoUpdateProject();
            waitForUpdate(true); // queue the transition to project page
        } else {
            waitForUpdate(false); // immediately transition to project page
        }
    }
    handleClickShare (waitForUpdate) {
        if (!this.props.isShared) {
            if (this.props.canShare) { // save before transitioning to project page
                this.props.onShare();
            }
            if (this.props.canSave) { // save before transitioning to project page
                this.props.autoUpdateProject();
                waitForUpdate(true); // queue the transition to project page
            } else {
                waitForUpdate(false); // immediately transition to project page
            }
        }
    }
    handleRestoreOption (restoreFun) {
        return () => {
            restoreFun();
            this.props.onRequestCloseEdit();
        };
    }
    handleCloseFileMenuAndThen (fn) {
        return () => {
            this.props.onRequestCloseFile();
            fn();
        };
    }
    handleKeyPress (event) {
        const modifier = bowser.mac ? event.metaKey : event.ctrlKey;
        if (modifier && event.key === 's') {
            this.props.onClickSave();
            event.preventDefault();
        }
    }
    restoreOptionMessage (deletedItem) {
        switch (deletedItem) {
        case 'Sprite':
            return (<FormattedMessage
                defaultMessage="Restore Sprite"
                description="Menu bar item for restoring the last deleted sprite."
                id="gui.menuBar.restoreSprite"
            />);
        case 'Sound':
            return (<FormattedMessage
                defaultMessage="Restore Sound"
                description="Menu bar item for restoring the last deleted sound."
                id="gui.menuBar.restoreSound"
            />);
        case 'Costume':
            return (<FormattedMessage
                defaultMessage="Restore Costume"
                description="Menu bar item for restoring the last deleted costume."
                id="gui.menuBar.restoreCostume"
            />);
        default: {
            return (<FormattedMessage
                defaultMessage="Restore"
                description="Menu bar item for restoring the last deleted item in its disabled state." /* eslint-disable-line max-len */
                id="gui.menuBar.restore"
            />);
        }
        }
    }
    render () {
        const saveNowMessage = (
            <FormattedMessage
                defaultMessage="Save now"
                description="Menu bar item for saving now"
                id="gui.menuBar.saveNow"
            />
        );
        const createCopyMessage = (
            <FormattedMessage
                defaultMessage="Save as a copy"
                description="Menu bar item for saving as a copy"
                id="gui.menuBar.saveAsCopy"
            />
        );
        const remixMessage = (
            <FormattedMessage
                defaultMessage="Remix"
                description="Menu bar item for remixing"
                id="gui.menuBar.remix"
            />
        );
        const newProjectMessage = (
            <FormattedMessage
                defaultMessage="New"
                description="Menu bar item for creating a new project"
                id="gui.menuBar.new"
            />
        );
        const remixButton = (
            <Button
                className={classNames(
                    styles.menuBarButton,
                    styles.remixButton
                )}
                iconClassName={styles.remixButtonIcon}
                iconSrc={remixIcon}
                onClick={this.handleClickRemix}
            >
                {remixMessage}
            </Button>
        );
        const locale = this.props.intl.locale;
        const isRussianLocale = typeof locale === 'string' && locale.toLowerCase().indexOf('ru') === 0;
        const logoWordmark = isRussianLocale ? 'РОББО' : 'ROBBO';
        return (
            <Box
                id="rs3-menu-bar"
                className={classNames(
                    this.props.className,
                    styles.menuBar
                )}
            >
                <div className={styles.mainMenu}>
                    <div className={styles.fileGroup}>
                        <div className={classNames(styles.menuBarItem)}>
                            <span
                                aria-label={logoWordmark}
                                className={classNames(styles.robboLogo, {
                                    [styles.clickable]: typeof this.props.onClickLogo !== 'undefined'
                                })}
                                onClick={this.props.onClickLogo}
                            >
                                <span className={styles.robboLogoWordmark} aria-hidden="true">
                                    {logoWordmark}
                                    <sup className={styles.robboLogoReg}>®</sup>
                                </span>
                            </span>
                        </div>
                        <div
                            className={classNames(styles.menuBarItem, styles.hoverable, styles.languageMenu, {
                                [styles.active]: this.props.languageMenuOpen
                            })}
                            onMouseUp={this.props.onClickLanguage}
                        >
                            <span className={styles.menuBarItemContent} aria-hidden="true">
                                <img
                                    alt=""
                                    className={styles.menuBarItemIcon}
                                    draggable={false}
                                    src={languageIcon}
                                />
                                <img
                                    alt=""
                                    className={styles.dropdownCaretIcon}
                                    draggable={false}
                                    src={dropdownCaret}
                                />
                            </span>
                            <LanguageSelector
                                menuListClassName={languageSelectorStyles.languageMenuList}
                                menuWrapperClassName={classNames(
                                    styles.menuBarMenu,
                                    languageSelectorStyles.languageMenuDropdown
                                )}
                                open={this.props.languageMenuOpen}
                                onRequestClose={this.props.onRequestCloseLanguage}
                            />
                        </div>
                        <div
                            className={classNames(styles.menuBarItem, styles.hoverable, {
                                [styles.active]: this.props.fileMenuOpen
                            })}
                            onMouseUp={this.props.onClickFile}
                        >
                            <span className={styles.menuBarItemContent}>
                                <img
                                    alt=""
                                    className={styles.menuBarItemIcon}
                                    draggable={false}
                                    src={fileIcon}
                                />
                                <span className={styles.menuBarItemLabel}>
                                    <FormattedMessage
                                        defaultMessage="File"
                                        description="Text for file dropdown menu"
                                        id="gui.menuBar.file"
                                    />
                                </span>
                                <img
                                    alt=""
                                    className={styles.dropdownCaretIcon}
                                    draggable={false}
                                    src={dropdownCaret}
                                />
                            </span>
                            <MenuBarMenu
                                className={classNames(styles.menuBarMenu)}
                                open={this.props.fileMenuOpen}
                                place={this.props.isRtl ? 'left' : 'right'}
                                onRequestClose={this.props.onRequestCloseFile}
                            >
                                <MenuSection>
                                    <MenuItem
                                        isRtl={this.props.isRtl}
                                        onClick={this.handleClickNew.bind(this)}
                                    >
                                        {newProjectMessage}
                                    </MenuItem>
                                </MenuSection>
                                {(this.props.canSave || this.props.canCreateCopy || this.props.canRemix) && (
                                    <MenuSection>
                                        {this.props.canSave ? (
                                            <MenuItem onClick={this.handleClickSave}>
                                                {saveNowMessage}
                                            </MenuItem>
                                        ) : []}
                                        {this.props.canCreateCopy ? (
                                            <MenuItem onClick={this.handleClickSaveAsCopy}>
                                                {createCopyMessage}
                                            </MenuItem>
                                        ) : []}
                                        {this.props.canRemix ? (
                                            <MenuItem onClick={this.handleClickRemix}>
                                                {remixMessage}
                                            </MenuItem>
                                        ) : []}
                                    </MenuSection>
                                )}
                                <MenuSection>
                                    <SBFileUploader onUpdateProjectTitle={this.props.onUpdateProjectTitle}>
                                        {(className, renderFileInput, loadProject) => (
                                            <MenuItem
                                                className={className}
                                                onClick={loadProject}
                                            >
                                                <FormattedMessage
                                                    defaultMessage="Load from your computer"
                                                    description={
                                                        'Menu bar item for uploading a project from your computer'
                                                    }
                                                    id="gui.menuBar.uploadFromComputer"
                                                />
                                                {renderFileInput()}
                                            </MenuItem>
                                        )}
                                    </SBFileUploader>
                                    <SB3Downloader>{(className, downloadProject) => (
                                        <MenuItem
                                            className={className}
                                            onClick={this.handleCloseFileMenuAndThen(downloadProject)}
                                        >
                                            <FormattedMessage
                                                defaultMessage="Save to your computer"
                                                description="Menu bar item for downloading a project to your computer"
                                                id="gui.menuBar.downloadToComputer"
                                            />
                                        </MenuItem>
                                    )}</SB3Downloader>
                                </MenuSection>
                                {this.props.isRobboAccountAuthenticated ? (
                                    <MenuSection>
                                        <MenuItem onClick={this.handleClickSaveToCloud}>
                                            {this.props.intl.formatMessage(messages.saveToCloud)}
                                        </MenuItem>
                                        <MenuItem onClick={this.handleClickSaveAsCloudCopy}>
                                            {this.props.intl.formatMessage(messages.saveAsCloudCopy)}
                                        </MenuItem>
                                    </MenuSection>
                                ) : null}
                            </MenuBarMenu>
                        </div>
                        <div
                            className={classNames(styles.menuBarItem, styles.hoverable, {
                                [styles.active]: this.props.editMenuOpen
                            })}
                            onMouseUp={this.props.onClickEdit}
                        >
                            <span className={styles.menuBarItemContent}>
                                <img
                                    alt=""
                                    className={styles.menuBarItemIcon}
                                    draggable={false}
                                    src={editIcon}
                                />
                                <span className={styles.menuBarItemLabel}>
                                    <FormattedMessage
                                        defaultMessage="Edit"
                                        description="Text for edit dropdown menu"
                                        id="gui.menuBar.edit"
                                    />
                                </span>
                                <img
                                    alt=""
                                    className={styles.dropdownCaretIcon}
                                    draggable={false}
                                    src={dropdownCaret}
                                />
                            </span>
                            <MenuBarMenu
                                className={classNames(styles.menuBarMenu)}
                                open={this.props.editMenuOpen}
                                place={this.props.isRtl ? 'left' : 'right'}
                                onRequestClose={this.props.onRequestCloseEdit}
                            >
                                <DeletionRestorer>{(handleRestore, {restorable, deletedItem}) => (
                                    <MenuItem
                                        className={classNames({[styles.disabled]: !restorable})}
                                        onClick={this.handleRestoreOption(handleRestore)}
                                    >
                                        {this.restoreOptionMessage(deletedItem)}
                                    </MenuItem>
                                )}</DeletionRestorer>
                                <MenuSection>
                                    <TurboMode>{(toggleTurboMode, {turboMode}) => (
                                        <MenuItem onClick={toggleTurboMode}>
                                            {turboMode ? (
                                                <FormattedMessage
                                                    defaultMessage="Turn off Turbo Mode"
                                                    description="Menu bar item for turning off turbo mode"
                                                    id="gui.menuBar.turboModeOff"
                                                />
                                            ) : (
                                                <FormattedMessage
                                                    defaultMessage="Turn on Turbo Mode"
                                                    description="Menu bar item for turning on turbo mode"
                                                    id="gui.menuBar.turboModeOn"
                                                />
                                            )}
                                        </MenuItem>
                                    )}</TurboMode>
                                </MenuSection>
                            </MenuBarMenu>
                        </div>
                    </div>
                    <Divider className={classNames(styles.divider)} />

                    <button
                        type="button"
                        id="toggle-robbo-ui"
                        className={classNames(styles.toggle_robbo_ui, {
                            [styles.toggle_robbo_ui_active]: !this.props.isRobboUiHidden
                        })}
                        title={this.props.intl.formatMessage(
                            this.props.isRobboUiHidden ? messages.showRobboUi : messages.hideRobboUi
                        )}
                        aria-label={this.props.intl.formatMessage(
                            this.props.isRobboUiHidden ? messages.showRobboUi : messages.hideRobboUi
                        )}
                        aria-pressed={!this.props.isRobboUiHidden ? 'true' : 'false'}
                        onClick={() => this.props.onSetRobboUiHidden(!this.props.isRobboUiHidden)}
                    >
                        <img
                            alt=""
                            aria-hidden="true"
                            className={classNames(styles.toggle_robbo_ui_icon, {
                                [styles.toggle_robbo_ui_icon_active]: !this.props.isRobboUiHidden
                            })}
                            draggable={false}
                            src={robboScratchIcon}
                        />
                    </button>
                    {!this.props.isRobboUiHidden ? (
                        <div id="robbo-menu-group" className={styles.robboMenuGroup}>
                            <div
                                id="trigger-robbo-menu"
                                className={styles.trigger_robbo_menu}
                                onClick={this.props.onTriggerRobboMenu}
                            >
                                <FormattedMessage
                                    defaultMessage="Robbo menu"
                                    description=""
                                    id="gui.menuBar.robbo_menu"
                                />
                            </div>
                            <MenuBarDeviceControls vm={this.props.vm} />
                        </div>
                    ) : null}

                    {this.props.cloudProjectPageId ? (
                        <div className={classNames(styles.menuBarItem, styles.projectTitleItem)}>
                            <ProjectTitleInput
                                onUpdateProjectTitle={this.handleUpdateCloudProjectTitle}
                            />
                        </div>
                    ) : null}
                    {this.props.cloudProjectPageId ? (
                        <div className={classNames(styles.menuBarItem)}>
                            <CommunityButton onClick={this.handleClickSeeProjectPage} />
                        </div>
                    ) : null}
                    {this.props.cloudSaveStatus === 'saving' ? (
                        <div className={classNames(styles.menuBarItem, styles.cloudSaveStatus)}>
                            {this.props.intl.formatMessage(messages.savingToCloud)}
                        </div>
                    ) : null}
                    {this.props.cloudSaveStatus === 'success' ? (
                        <div className={classNames(styles.menuBarItem, styles.cloudSaveStatus)}>
                            {this.props.intl.formatMessage(messages.savedToCloud)}
                        </div>
                    ) : null}
                    {this.props.cloudSaveStatus === 'error' ? (
                        <div className={classNames(styles.menuBarItem, styles.cloudSaveStatusError)}>
                            {this.props.intl.formatMessage(messages.saveToCloudError)}
                        </div>
                    ) : null}
                </div>

                <div className={styles.accountInfoGroup}>
                    {this.props.isRobboAccountAuthenticated ? (
                        <React.Fragment>
                            <div
                                className={classNames(styles.menuBarItem, styles.hoverable, styles.mystuffButton)}
                                title={this.props.intl.formatMessage(messages.myStuff)}
                                onClick={this.handleClickMyStuff}
                            >
                                <img
                                    alt={this.props.intl.formatMessage(messages.myStuff)}
                                    className={styles.mystuffIcon}
                                    draggable={false}
                                    src={mystuffIcon}
                                />
                            </div>
                            <div
                                className={classNames(styles.menuBarItem, styles.hoverable, {
                                    [styles.active]: this.props.accountMenuOpen
                                })}
                                onMouseUp={this.props.onClickAccount}
                            >
                                <img
                                    alt=""
                                    className={styles.profileIcon}
                                    draggable={false}
                                    src={profileIcon}
                                />
                                <span>
                                    {(this.props.robboAccountUser && this.props.robboAccountUser.displayName) ||
                                        this.props.intl.formatMessage(messages.accountHome)}
                                </span>
                                <img
                                    alt=""
                                    className={styles.dropdownCaretIcon}
                                    draggable={false}
                                    src={dropdownCaret}
                                />
                                <MenuBarMenu
                                    className={classNames(styles.menuBarMenu, styles.accountMenuDropdown)}
                                    open={this.props.accountMenuOpen}
                                    place={this.props.isRtl ? 'right' : 'left'}
                                    onRequestClose={this.props.onRequestCloseAccount}
                                >
                                    <MenuItem onClick={this.handleClickAccountHome}>
                                        {this.props.intl.formatMessage(messages.accountHome)}
                                    </MenuItem>
                                    <MenuSection>
                                        <MenuItem onClick={this.handleClickSignOut}>
                                            {this.props.intl.formatMessage(messages.signOut)}
                                        </MenuItem>
                                    </MenuSection>
                                </MenuBarMenu>
                            </div>
                        </React.Fragment>
                    ) : (
                        <div
                            className={classNames(styles.menuBarItem, styles.hoverable, {
                                [styles.active]: this.props.loginMenuOpen
                            })}
                            onMouseUp={this.props.onClickLogin}
                        >
                            {this.props.intl.formatMessage(messages.signIn)}
                            <LoginDropdown
                                className={classNames(styles.menuBarMenu)}
                                isOpen={this.props.loginMenuOpen}
                                isRtl={this.props.isRtl}
                                renderLogin={({onClose}) => (
                                    <RobboLoginForm onClose={onClose} />
                                )}
                                onClose={this.props.onRequestCloseLogin}
                            />
                        </div>
                    )}
                </div>
            </Box>
        );
    }
}

MenuBar.propTypes = {
    accountMenuOpen: PropTypes.bool,
    authorId: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    authorThumbnailUrl: PropTypes.string,
    authorUsername: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    autoUpdateProject: PropTypes.func,
    canCreateCopy: PropTypes.bool,
    canCreateNew: PropTypes.bool,
    canEditTitle: PropTypes.bool,
    canRemix: PropTypes.bool,
    canSave: PropTypes.bool,
    canShare: PropTypes.bool,
    className: PropTypes.string,
    cloudProjectPageId: PropTypes.string,
    cloudSaveStatus: PropTypes.string,
    editMenuOpen: PropTypes.bool,
    enableCommunity: PropTypes.bool,
    fileMenuOpen: PropTypes.bool,
    intl: intlShape,
    isRobboAccountAuthenticated: PropTypes.bool,
    isRtl: PropTypes.bool,
    isRobboUiHidden: PropTypes.bool,
    isShared: PropTypes.bool,
    isShowingProject: PropTypes.bool,
    isUpdating: PropTypes.bool,
    languageMenuOpen: PropTypes.bool,
    loginMenuOpen: PropTypes.bool,
    onClickAccount: PropTypes.func,
    onClickEdit: PropTypes.func,
    onClickFile: PropTypes.func,
    onClickLanguage: PropTypes.func,
    onClickLogin: PropTypes.func,
    onClickLogo: PropTypes.func,
    onClickNew: PropTypes.func,
    onClickRemix: PropTypes.func,
    onClickSave: PropTypes.func,
    onClickSaveAsCopy: PropTypes.func,
    onCheckSession: PropTypes.func,
    onLogOut: PropTypes.func,
    onOpenRegistration: PropTypes.func,
    onOpenTipLibrary: PropTypes.func,
    onOpenScenariosLibrary: PropTypes.func,
    onSaveToCloud: PropTypes.func,
    onSetRobboUiHidden: PropTypes.func,
    onSignOut: PropTypes.func,
    onRequestCloseAccount: PropTypes.func,
    onRequestCloseEdit: PropTypes.func,
    onRequestCloseFile: PropTypes.func,
    onRequestCloseLanguage: PropTypes.func,
    onRequestCloseLogin: PropTypes.func,
    onSeeCommunity: PropTypes.func,
    onShare: PropTypes.func,
    onToggleLoginOpen: PropTypes.func,
    onUpdateCloudProjectTitle: PropTypes.func,
    onUpdateProjectTitle: PropTypes.func,
    projectChanged: PropTypes.bool,
    projectTitle: PropTypes.string,
    robboAccountUser: PropTypes.object,
    sessionExists: PropTypes.bool,
    showComingSoon: PropTypes.bool,
    username: PropTypes.string,
    vm: PropTypes.object
};

MenuBar.defaultProps = {
    onShare: () => {}
};

const mapStateToProps = state => {
    const loadingState = state.scratchGui.projectState.loadingState;
    const user = state.session && state.session.session && state.session.session.user;
    const robboAccount = state.scratchGui.robboAccount || {};

    return {
        accountMenuOpen: accountMenuOpen(state),
        cloudProjectPageId: robboAccount.cloudProjectPageId || '',
        cloudSaveStatus: robboAccount.saveStatus || 'idle',
        fileMenuOpen: fileMenuOpen(state),
        editMenuOpen: editMenuOpen(state),
        isRobboAccountAuthenticated: robboAccount.sessionStatus === 'authenticated',
        isRtl: state.locales.isRtl,
        isUpdating: getIsUpdating(loadingState),
        isShowingProject: getIsShowingProject(loadingState),
        languageMenuOpen: languageMenuOpen(state),
        loginMenuOpen: loginMenuOpen(state),
        projectChanged: state.scratchGui.projectChanged,
        projectTitle: state.scratchGui.projectTitle,
        robboAccountUser: robboAccount.user,
        sessionExists: state.session && typeof state.session.session !== 'undefined',
        username: user ? user.username : null,
        vm: state.scratchGui.vm,
        isRobboUiHidden: state.scratchGui.layoutVisibility.isRobboUiHidden
    };
};

const mapDispatchToProps = dispatch => ({
    autoUpdateProject: () => dispatch(autoUpdateProject()),
    onOpenTipLibrary: () => dispatch(openTipsLibrary()),
    onOpenScenariosLibrary: () => dispatch(openScenariosLibrary()),
    onCheckSession: () => dispatch(checkSessionThunk()),
    onClickAccount: () => dispatch(openAccountMenu()),
    onRequestCloseAccount: () => dispatch(closeAccountMenu()),
    onClickFile: () => dispatch(openFileMenu()),
    onRequestCloseFile: () => dispatch(closeFileMenu()),
    onClickEdit: () => dispatch(openEditMenu()),
    onRequestCloseEdit: () => dispatch(closeEditMenu()),
    onClickLanguage: () => dispatch(openLanguageMenu()),
    onRequestCloseLanguage: () => dispatch(closeLanguageMenu()),
    onClickLogin: () => dispatch(openLoginMenu()),
    onRequestCloseLogin: () => dispatch(closeLoginMenu()),
    onClickNew: needSave => dispatch(requestNewProject(needSave)),
    onClickRemix: () => dispatch(remixProject()),
    onClickSave: () => dispatch(manualUpdateProject()),
    onClickSaveAsCopy: () => dispatch(saveProjectAsCopy()),
    onSaveToCloud: opts => dispatch(saveToCloudThunk(opts)),
    onSignOut: () => dispatch(signOutThunk()),
    onUpdateCloudProjectTitle: title => dispatch(updateCloudProjectTitleThunk(title)),
    onSeeCommunity: () => dispatch(setPlayer(true)),
    onTriggerRobboMenu: () => {
        dispatch(ActionTriggerRobboMenu());
    },
    onSetRobboUiHidden: isHidden => dispatch(setRobboUiHidden(isHidden))
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(MenuBar));
