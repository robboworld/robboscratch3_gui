import classNames from 'classnames';
import {connect} from 'react-redux';
import {compose} from 'redux';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import bowser from 'bowser';
import React from 'react';

import VM from 'scratch-vm';

import Box from '../box/box.jsx';
import Button from '../button/button.jsx';
import CommunityButton from './community-button.jsx';
import ShareButton from './share-button.jsx';
import {ComingSoonTooltip} from '../coming-soon/coming-soon.jsx';
import Divider from '../divider/divider.jsx';
import SaveStatus from './save-status.jsx';
import ProjectWatcher from '../../containers/project-watcher.jsx';
import MenuBarMenu from './menu-bar-menu.jsx';
import {MenuItem, MenuSection} from '../menu/menu.jsx';
import ProjectTitleInput from './project-title-input.jsx';
import AuthorInfo from './author-info.jsx';
import AccountNav from '../../containers/account-nav.jsx';
import LoginDropdown from './login-dropdown.jsx';
import SB3Downloader from '../../containers/sb3-downloader.jsx';
import DeletionRestorer from '../../containers/deletion-restorer.jsx';
import TurboMode from '../../containers/turbo-mode.jsx';
import MenuBarHOC from '../../containers/menu-bar-hoc.jsx';
import SettingsMenu from './settings-menu.jsx';

import {openTipsLibrary, openScenariosLibrary} from '../../reducers/modals';
import {setPlayer} from '../../reducers/mode';
import {
    isTimeTravel220022BC,
    isTimeTravel1920,
    isTimeTravel1990,
    isTimeTravel2020,
    isTimeTravelNow,
    setTimeTravel
} from '../../reducers/time-travel';
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
    openAboutMenu,
    closeAboutMenu,
    aboutMenuOpen,
    openAccountMenu,
    closeAccountMenu,
    accountMenuOpen,
    openFileMenu,
    closeFileMenu,
    fileMenuOpen,
    openEditMenu,
    closeEditMenu,
    editMenuOpen,
    openLoginMenu,
    closeLoginMenu,
    loginMenuOpen,
    openModeMenu,
    closeModeMenu,
    modeMenuOpen,
    settingsMenuOpen,
    openSettingsMenu,
    closeSettingsMenu
} from '../../reducers/menus';

import collectMetadata from '../../lib/collect-metadata';

import styles from './menu-bar.css';

import helpIcon from '../../lib/assets/icon--tutorials.svg';
import mystuffIcon from './icon--mystuff.png';
import profileIcon from './icon--profile.png';
import remixIcon from './icon--remix.svg';
import dropdownCaret from './dropdown-caret.svg';
import aboutIcon from './icon--about.svg';
import fileIcon from './icon--file.svg';
import editIcon from './icon--edit.svg';
import robboScratchIcon from './icon--robboscratch3.png';

import sharedMessages from '../../lib/shared-messages';

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
    loginUrl,
    myProjectsUrl,
    projectPageUrl,
    resolveLkBase
} from '../../lib/robbo-account/robboAccountConfig';
import {AUTH_UI_ENABLED} from '../../lib/licensing/licenseUiEnabled';

// Robbo: Scratch tutorials are English-only (no ru screenshots, Wistia videos); the cards engine stays for
// future Robbo lessons in lib/libraries/decks/index.jsx — enable the menu button once there are some
const TUTORIALS_UI_ENABLED = false;

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

const AboutButton = props => (
    <Button
        className={classNames(styles.menuBarItem, styles.hoverable)}
        iconClassName={styles.aboutIcon}
        iconSrc={aboutIcon}
        onClick={props.onClick}
    />
);

AboutButton.propTypes = {
    onClick: PropTypes.func.isRequired
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
            'handleSetMode',
            'handleKeyPress',
            'handleRestoreOption',
            'getSaveToComputerHandler',
            'restoreOptionMessage',
            'handleClickSignIn',
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
        if (AUTH_UI_ENABLED && this.props.onCheckSession) {
            this.props.onCheckSession();
        }
    }
    componentWillUnmount () {
        document.removeEventListener('keydown', this.handleKeyPress);
    }
    handleClickSignIn () {
        const returnTo = (typeof window !== 'undefined' && window.top && window.top.location) ?
            window.top.location.href :
            (typeof window !== 'undefined' ? window.location.href : '');
        navigateTop(loginUrl(returnTo));
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
        if (this.props.shouldSaveBeforeTransition()) {
            this.props.autoUpdateProject(); // save before transitioning to project page
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
    handleSetMode (mode) {
        return () => {
            // Turn on/off filters for modes.
            if (mode === '1920') {
                document.documentElement.style.filter = 'brightness(.9)contrast(.8)sepia(1.0)';
                document.documentElement.style.height = '100%';
            } else if (mode === '1990') {
                document.documentElement.style.filter = 'hue-rotate(40deg)';
                document.documentElement.style.height = '100%';
            } else {
                document.documentElement.style.filter = '';
                document.documentElement.style.height = '';
            }

            this.props.onSetTimeTravelMode(mode);
        };
    }
    handleRestoreOption (restoreFun) {
        return () => {
            restoreFun();
            this.props.onRequestCloseEdit();
        };
    }
    handleKeyPress (event) {
        const modifier = bowser.mac ? event.metaKey : event.ctrlKey;
        if (modifier && event.key === 's') {
            this.props.onClickSave();
            event.preventDefault();
        }
    }
    getSaveToComputerHandler (downloadProjectCallback) {
        return () => {
            this.props.onRequestCloseFile();
            downloadProjectCallback();
            if (this.props.onProjectTelemetryEvent) {
                const metadata = collectMetadata(this.props.vm, this.props.projectTitle, this.props.locale);
                this.props.onProjectTelemetryEvent('projectDidSave', metadata);
            }
        };
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
    buildAboutMenu (onClickAbout) {
        if (!onClickAbout) {
            // hide the button
            return null;
        }
        if (typeof onClickAbout === 'function') {
            // make a button which calls a function
            return <AboutButton onClick={onClickAbout} />;
        }
        // assume it's an array of objects
        // each item must have a 'title' FormattedMessage and a 'handleClick' function
        // generate a menu with items for each object in the array
        return (
            <div
                className={classNames(styles.menuBarItem, styles.hoverable, {
                    [styles.active]: this.props.aboutMenuOpen
                })}
                onMouseUp={this.props.onRequestOpenAbout}
            >
                <img
                    className={styles.aboutIcon}
                    src={aboutIcon}
                />
                <MenuBarMenu
                    className={classNames(styles.menuBarMenu)}
                    open={this.props.aboutMenuOpen}
                    place={this.props.isRtl ? 'right' : 'left'}
                    onRequestClose={this.props.onRequestCloseAbout}
                >
                    {
                        onClickAbout.map(itemProps => (
                            <MenuItem
                                key={itemProps.title}
                                isRtl={this.props.isRtl}
                                onClick={this.wrapAboutMenuCallback(itemProps.onClick)}
                            >
                                {itemProps.title}
                            </MenuItem>
                        ))
                    }
                </MenuBarMenu>
            </div>
        );
    }
    wrapAboutMenuCallback (callback) {
        return () => {
            callback();
            this.props.onRequestCloseAbout();
        };
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
        // Show the About button only if we have a handler for it (like in the desktop app)
        const aboutButton = this.buildAboutMenu(this.props.onClickAbout);
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
                        {(this.props.canChangeTheme || this.props.canChangeLanguage) && (<SettingsMenu
                            canChangeLanguage={this.props.canChangeLanguage}
                            canChangeTheme={this.props.canChangeTheme}
                            isRtl={this.props.isRtl}
                            onRequestClose={this.props.onRequestCloseSettings}
                            onRequestOpen={this.props.onClickSettings}
                            settingsMenuOpen={this.props.settingsMenuOpen}
                        />)}
                        {(this.props.canManageFiles) && (
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
                                            onClick={this.handleClickNew}
                                        >
                                            {newProjectMessage}
                                        </MenuItem>
                                    </MenuSection>
                                    {(this.props.canSave || this.props.canCreateCopy || this.props.canRemix) && (
                                        <MenuSection>
                                            {this.props.canSave && (
                                                <MenuItem onClick={this.handleClickSave}>
                                                    {saveNowMessage}
                                                </MenuItem>
                                            )}
                                            {this.props.canCreateCopy && (
                                                <MenuItem onClick={this.handleClickSaveAsCopy}>
                                                    {createCopyMessage}
                                                </MenuItem>
                                            )}
                                            {this.props.canRemix && (
                                                <MenuItem onClick={this.handleClickRemix}>
                                                    {remixMessage}
                                                </MenuItem>
                                            )}
                                        </MenuSection>
                                    )}
                                    <MenuSection>
                                        <MenuItem
                                            onClick={this.props.onStartSelectingFileUpload}
                                        >
                                            {this.props.intl.formatMessage(sharedMessages.loadFromComputerTitle)}
                                        </MenuItem>
                                        <SB3Downloader>{(className, downloadProjectCallback) => (
                                            <MenuItem
                                                className={className}
                                                onClick={this.getSaveToComputerHandler(downloadProjectCallback)}
                                            >
                                                <FormattedMessage
                                                    defaultMessage="Save to your computer"
                                                    description="Menu bar item for downloading a project to your computer" // eslint-disable-line max-len
                                                    id="gui.menuBar.downloadToComputer"
                                                />
                                            </MenuItem>
                                        )}</SB3Downloader>
                                    </MenuSection>
                                    {AUTH_UI_ENABLED && this.props.isRobboAccountAuthenticated ? (
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
                        )}
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
                        {this.props.isTotallyNormal && (
                            <div
                                className={classNames(styles.menuBarItem, styles.hoverable, {
                                    [styles.active]: this.props.modeMenuOpen
                                })}
                                onMouseUp={this.props.onClickMode}
                            >
                                <div className={classNames(styles.editMenu)}>
                                    <FormattedMessage
                                        defaultMessage="Mode"
                                        description="Mode menu item in the menu bar"
                                        id="gui.menuBar.modeMenu"
                                    />
                                </div>
                                <MenuBarMenu
                                    className={classNames(styles.menuBarMenu)}
                                    open={this.props.modeMenuOpen}
                                    place={this.props.isRtl ? 'left' : 'right'}
                                    onRequestClose={this.props.onRequestCloseMode}
                                >
                                    <MenuSection>
                                        <MenuItem onClick={this.handleSetMode('NOW')}>
                                            <span className={classNames({[styles.inactive]: !this.props.modeNow})}>
                                                {'✓'}
                                            </span>
                                            {' '}
                                            <FormattedMessage
                                                defaultMessage="Normal mode"
                                                description="April fools: resets editor to not have any pranks"
                                                id="gui.menuBar.normalMode"
                                            />
                                        </MenuItem>
                                        <MenuItem onClick={this.handleSetMode('2020')}>
                                            <span className={classNames({[styles.inactive]: !this.props.mode2020})}>
                                                {'✓'}
                                            </span>
                                            {' '}
                                            <FormattedMessage
                                                defaultMessage="Caturday mode"
                                                description="April fools: Cat blocks mode"
                                                id="gui.menuBar.caturdayMode"
                                            />
                                        </MenuItem>
                                    </MenuSection>
                                </MenuBarMenu>
                            </div>
                        )}
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
                        <div className={classNames(styles.menuBarItem, styles.growable)}>
                            <ProjectTitleInput
                                className={classNames(styles.titleFieldGrowable)}
                                onUpdateProjectTitle={this.handleUpdateCloudProjectTitle}
                            />
                        </div>
                    ) : null}
                    {AUTH_UI_ENABLED && this.props.cloudProjectPageId ? (
                        <div className={classNames(styles.menuBarItem)}>
                            <CommunityButton onClick={this.handleClickSeeProjectPage} />
                        </div>
                    ) : null}
                    {AUTH_UI_ENABLED && this.props.cloudSaveStatus === 'saving' ? (
                        <div className={classNames(styles.menuBarItem, styles.cloudSaveStatus)}>
                            {this.props.intl.formatMessage(messages.savingToCloud)}
                        </div>
                    ) : null}
                    {AUTH_UI_ENABLED && this.props.cloudSaveStatus === 'success' ? (
                        <div className={classNames(styles.menuBarItem, styles.cloudSaveStatus)}>
                            {this.props.intl.formatMessage(messages.savedToCloud)}
                        </div>
                    ) : null}
                    {AUTH_UI_ENABLED && this.props.cloudSaveStatus === 'error' ? (
                        <div className={classNames(styles.menuBarItem, styles.cloudSaveStatusError)}>
                            {this.props.intl.formatMessage(messages.saveToCloudError)}
                        </div>
                    ) : null}
                    {TUTORIALS_UI_ENABLED && <Divider className={classNames(styles.divider)} />}
                    {TUTORIALS_UI_ENABLED && (
                        <div className={styles.fileGroup}>
                            <div
                                aria-label={this.props.intl.formatMessage(ariaMessages.tutorials)}
                                className={classNames(styles.menuBarItem, styles.hoverable, 'tutorials-button')}
                                onClick={this.props.onOpenTipLibrary}
                            >
                                <img
                                    className={styles.helpIcon}
                                    src={helpIcon}
                                />
                                <span className={styles.tutorialsLabel}>
                                    <FormattedMessage {...ariaMessages.tutorials} />
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {AUTH_UI_ENABLED ? (
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
                                    className={classNames(styles.menuBarMenu)}
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
                            className={classNames(styles.menuBarItem, styles.hoverable)}
                            onClick={this.handleClickSignIn}
                        >
                            {this.props.intl.formatMessage(messages.signIn)}
                        </div>
                    )}
                </div>
                ) : null}

                {aboutButton}
            </Box>
        );
    }
}

MenuBar.propTypes = {
    aboutMenuOpen: PropTypes.bool,
    accountMenuOpen: PropTypes.bool,
    authorId: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    authorThumbnailUrl: PropTypes.string,
    authorUsername: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    autoUpdateProject: PropTypes.func,
    canChangeLanguage: PropTypes.bool,
    canChangeTheme: PropTypes.bool,
    canCreateCopy: PropTypes.bool,
    canCreateNew: PropTypes.bool,
    canEditTitle: PropTypes.bool,
    canManageFiles: PropTypes.bool,
    canRemix: PropTypes.bool,
    canSave: PropTypes.bool,
    canShare: PropTypes.bool,
    className: PropTypes.string,
    cloudProjectPageId: PropTypes.string,
    cloudSaveStatus: PropTypes.string,
    confirmReadyToReplaceProject: PropTypes.func,
    currentLocale: PropTypes.string.isRequired,
    editMenuOpen: PropTypes.bool,
    enableCommunity: PropTypes.bool,
    fileMenuOpen: PropTypes.bool,
    intl: intlShape,
    isRobboAccountAuthenticated: PropTypes.bool,
    isRtl: PropTypes.bool,
    isRobboUiHidden: PropTypes.bool,
    isShared: PropTypes.bool,
    isShowingProject: PropTypes.bool,
    isTotallyNormal: PropTypes.bool,
    isUpdating: PropTypes.bool,
    locale: PropTypes.string.isRequired,
    loginMenuOpen: PropTypes.bool,
    logo: PropTypes.string,
    mode1920: PropTypes.bool,
    mode1990: PropTypes.bool,
    mode2020: PropTypes.bool,
    mode220022BC: PropTypes.bool,
    modeMenuOpen: PropTypes.bool,
    modeNow: PropTypes.bool,
    onClickAbout: PropTypes.oneOfType([
        PropTypes.func, // button mode: call this callback when the About button is clicked
        PropTypes.arrayOf( // menu mode: list of items in the About menu
            PropTypes.shape({
                title: PropTypes.string, // text for the menu item
                onClick: PropTypes.func // call this callback when the menu item is clicked
            })
        )
    ]),
    onClickAccount: PropTypes.func,
    onClickEdit: PropTypes.func,
    onClickFile: PropTypes.func,
    onClickLogin: PropTypes.func,
    onClickLogo: PropTypes.func,
    onClickMode: PropTypes.func,
    onClickNew: PropTypes.func,
    onClickRemix: PropTypes.func,
    onClickSave: PropTypes.func,
    onClickSaveAsCopy: PropTypes.func,
    onClickSettings: PropTypes.func,
    onCheckSession: PropTypes.func,
    onLogOut: PropTypes.func,
    onOpenRegistration: PropTypes.func,
    onOpenTipLibrary: PropTypes.func,
    onOpenScenariosLibrary: PropTypes.func,
    onProjectTelemetryEvent: PropTypes.func,
    onSaveToCloud: PropTypes.func,
    onSetRobboUiHidden: PropTypes.func,
    onSignOut: PropTypes.func,
    onRequestCloseAbout: PropTypes.func,
    onRequestCloseAccount: PropTypes.func,
    onRequestCloseEdit: PropTypes.func,
    onRequestCloseFile: PropTypes.func,
    onRequestCloseLogin: PropTypes.func,
    onRequestCloseMode: PropTypes.func,
    onRequestCloseSettings: PropTypes.func,
    onRequestOpenAbout: PropTypes.func,
    onSeeCommunity: PropTypes.func,
    onSetTimeTravelMode: PropTypes.func,
    onShare: PropTypes.func,
    onStartSelectingFileUpload: PropTypes.func,
    onToggleLoginOpen: PropTypes.func,
    onTriggerRobboMenu: PropTypes.func,
    onUpdateCloudProjectTitle: PropTypes.func,
    onUpdateProjectTitle: PropTypes.func,
    projectTitle: PropTypes.string,
    renderLogin: PropTypes.func,
    robboAccountUser: PropTypes.object,
    sessionExists: PropTypes.bool,
    settingsMenuOpen: PropTypes.bool,
    shouldSaveBeforeTransition: PropTypes.func,
    showComingSoon: PropTypes.bool,
    username: PropTypes.string,
    userOwnsProject: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired
};

MenuBar.defaultProps = {
    onShare: () => {}
};

const mapStateToProps = (state, ownProps) => {
    const loadingState = state.scratchGui.projectState.loadingState;
    const user = state.session && state.session.session && state.session.session.user;
    const robboAccount = state.scratchGui.robboAccount || {};

    return {
        aboutMenuOpen: aboutMenuOpen(state),
        accountMenuOpen: accountMenuOpen(state),
        cloudProjectPageId: robboAccount.cloudProjectPageId || '',
        cloudSaveStatus: robboAccount.saveStatus || 'idle',
        currentLocale: state.locales.locale,
        fileMenuOpen: fileMenuOpen(state),
        editMenuOpen: editMenuOpen(state),
        isRobboAccountAuthenticated: robboAccount.sessionStatus === 'authenticated',
        isRtl: state.locales.isRtl,
        isUpdating: getIsUpdating(loadingState),
        isShowingProject: getIsShowingProject(loadingState),
        locale: state.locales.locale,
        loginMenuOpen: loginMenuOpen(state),
        modeMenuOpen: modeMenuOpen(state),
        projectTitle: state.scratchGui.projectTitle,
        robboAccountUser: robboAccount.user,
        sessionExists: state.session && typeof state.session.session !== 'undefined',
        settingsMenuOpen: settingsMenuOpen(state),
        username: user ? user.username : null,
        userOwnsProject: ownProps.authorUsername && user &&
            (ownProps.authorUsername === user.username),
        vm: state.scratchGui.vm,
        isRobboUiHidden: state.scratchGui.layoutVisibility.isRobboUiHidden,
        mode220022BC: isTimeTravel220022BC(state),
        mode1920: isTimeTravel1920(state),
        mode1990: isTimeTravel1990(state),
        mode2020: isTimeTravel2020(state),
        modeNow: isTimeTravelNow(state)
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
    onClickLogin: () => dispatch(openLoginMenu()),
    onRequestCloseLogin: () => dispatch(closeLoginMenu()),
    onClickMode: () => dispatch(openModeMenu()),
    onRequestCloseMode: () => dispatch(closeModeMenu()),
    onRequestOpenAbout: () => dispatch(openAboutMenu()),
    onRequestCloseAbout: () => dispatch(closeAboutMenu()),
    onClickSettings: () => dispatch(openSettingsMenu()),
    onRequestCloseSettings: () => dispatch(closeSettingsMenu()),
    onClickNew: needSave => dispatch(requestNewProject(needSave)),
    onClickRemix: () => dispatch(remixProject()),
    onClickSave: () => dispatch(manualUpdateProject()),
    onClickSaveAsCopy: () => dispatch(saveProjectAsCopy()),
    onSaveToCloud: opts => dispatch(saveToCloudThunk(opts)),
    onSignOut: () => dispatch(signOutThunk()),
    onUpdateCloudProjectTitle: title => dispatch(updateCloudProjectTitleThunk(title)),
    onSeeCommunity: () => dispatch(setPlayer(true)),
    onSetTimeTravelMode: mode => dispatch(setTimeTravel(mode)),
    onTriggerRobboMenu: () => {
        dispatch(ActionTriggerRobboMenu());
    },
    onSetRobboUiHidden: isHidden => dispatch(setRobboUiHidden(isHidden))
});

export default compose(
    injectIntl,
    MenuBarHOC,
    connect(
        mapStateToProps,
        mapDispatchToProps
    )
)(MenuBar);
