import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import classNames from 'classnames';

import sharedStyles from './DevicePaletteShared.css';
import formStyles from './RobboPaletteForm.css';
import styles from './WhatsNewWindowComponent.css';
import {ActionTriggerNewDraggableWindow} from './actions/sensor_actions';
import {
    WHATS_NEW_WINDOW_ID,
    setUpdateCheckThunk,
    whatsNewSeen,
    whatsNewShowAll
} from './reducers/whats_new';
import {premiumDownloadAndInstallThunk} from './actions/licenseActions';
import {hasPremiumAutoUpdateCapability} from '../lib/licensing/capabilityGateway';
import {whatsNewLanguage} from '../lib/whats-new-state';
import {openExternalUrl} from '../lib/platform';
import {resolveDownloadUrl} from '../lib/update-check';
import {closeMessage} from './sensor-type-messages';

const messages = defineMessages({
    title: {
        id: 'gui.WhatsNew.title',
        defaultMessage: 'What\'s new in Robbo Scratch'
    },
    version: {
        id: 'gui.WhatsNew.version',
        defaultMessage: 'Version {version}'
    },
    versionRange: {
        id: 'gui.WhatsNew.version_range',
        defaultMessage: 'Version {from} → {to}'
    },
    added: {
        id: 'gui.WhatsNew.section_added',
        defaultMessage: 'New'
    },
    changed: {
        id: 'gui.WhatsNew.section_changed',
        defaultMessage: 'Changed'
    },
    fixed: {
        id: 'gui.WhatsNew.section_fixed',
        defaultMessage: 'Fixed'
    },
    important: {
        id: 'gui.WhatsNew.important',
        defaultMessage: 'Important'
    },
    showAll: {
        id: 'gui.WhatsNew.show_all',
        defaultMessage: 'Earlier releases'
    },
    ok: {
        id: 'gui.WhatsNew.ok',
        defaultMessage: 'Got it'
    },
    updateAvailable: {
        id: 'gui.WhatsNew.update_available',
        defaultMessage: 'Version {version} is available'
    },
    updateAlpha: {
        id: 'gui.WhatsNew.update_alpha',
        defaultMessage: 'Test version {version} is available'
    },
    alphaHint: {
        id: 'gui.WhatsNew.alpha_hint',
        defaultMessage: 'For those who want to try new features earlier: it may contain bugs. For lessons the stable version is better.'
    },
    download: {
        id: 'gui.WhatsNew.download',
        defaultMessage: 'Download'
    },
    updateNow: {
        id: 'gui.WhatsNew.update_now',
        defaultMessage: 'Update'
    },
    upToDate: {
        id: 'gui.WhatsNew.up_to_date',
        defaultMessage: 'You have the latest version: {version}.'
    },
    checkUpdates: {
        id: 'gui.WhatsNew.check_updates',
        defaultMessage: 'Check for new versions'
    },
    testTag: {
        id: 'gui.WhatsNew.test_tag',
        defaultMessage: 'Test'
    },
    changesCount: {
        id: 'gui.WhatsNew.changes_count',
        defaultMessage: '{count, plural, one {# change} other {# changes}}'
    }
});

/** 3.138.0-alpha, 3.140.0-rc.1: a test version */
const isTestVersion = version => /^\d+\.\d+\.\d+-[A-Za-z]/.test(version);

const SECTIONS = ['added', 'changed', 'fixed'];

// **bold**, `code`, [text](https://…) — the only markup release-notes may use (skill rs3-release-notes)
const INLINE_RE = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

/**
 * @param {string} text release-notes item text
 * @returns {Array<string|React.Element>} text with bold, code and links as elements, no raw HTML
 */
const renderInline = text => {
    const parts = [];
    let last = 0;
    let match;
    INLINE_RE.lastIndex = 0;
    while ((match = INLINE_RE.exec(text)) !== null) {
        if (match.index > last) parts.push(text.slice(last, match.index));
        const key = `${match.index}`;
        if (match[1]) {
            parts.push(<strong key={key}>{match[1]}</strong>);
        } else if (match[2]) {
            parts.push(<code key={key}>{match[2]}</code>);
        } else {
            const url = match[4];
            parts.push(
                <a
                    key={key}
                    href={url}
                    onClick={event => {
                        event.preventDefault();
                        openExternalUrl(url);
                    }}
                >{match[3]}</a>
            );
        }
        last = INLINE_RE.lastIndex;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
};

class WhatsNewWindowComponent extends Component {
    constructor (props) {
        super(props);
        this.handleClose = this.handleClose.bind(this);
        this.handleCheckUpdatesChange = this.handleCheckUpdatesChange.bind(this);
        // unread at the moment the window opened: closing marks it read, but the fading window keeps it
        // releases opened by the user. One release is shown open; several start collapsed — the chain of
        // versions first, details on click
        this.state = {wasShowing: false, unread: [], sinceVersion: '', expanded: {}};
    }

    static getDerivedStateFromProps (props, state) {
        if (props.isShowing && !state.wasShowing) {
            return {wasShowing: true, unread: props.unread, sinceVersion: props.sinceVersion, expanded: {}};
        }
        if (!props.isShowing && state.wasShowing) return {wasShowing: false};
        return null;
    }

    componentDidUpdate (prevProps) {
        // closed by the button, the cross or Esc: everything up to this build is read
        if (prevProps.isShowing && !this.props.isShowing && this.props.current) {
            this.props.onSeen(this.props.current);
        }
    }

    handleClose () {
        this.props.onClose();
    }

    handleCheckUpdatesChange (event) {
        this.props.onSetUpdateCheck(event.target.checked);
    }

    handleUpdate (offer) {
        // the first mirror that has the installer: one mirror may be down or miss the upload
        resolveDownloadUrl(offer).then(downloadUrl => {
            if (this.props.canInstall) {
                // the paid addon downloads and runs the installer; its progress window takes over
                this.props.onClose();
                this.props.onInstall(Object.assign({}, offer, {downloadUrl}));
            } else {
                openExternalUrl(downloadUrl);
            }
        });
    }

    renderNotes (text) {
        const intl = this.props.intl;
        return (
            <React.Fragment>
                {text.intro ? <p className={styles.intro}>{renderInline(text.intro)}</p> : null}
                {SECTIONS.filter(key => text.sections[key].length).map(key => (
                    <div
                        key={key}
                        className={styles.group}
                    >
                        <h4 className={classNames(styles.group_title, styles[`group_title_${key}`])}>
                            {intl.formatMessage(messages[key])}
                        </h4>
                        <ul className={styles.items}>
                            {text.sections[key].map((item, index) => (
                                <li
                                    key={index}
                                    className={classNames(styles.item, {[styles.item_important]: item.important})}
                                >
                                    <div className={styles.item_title}>
                                        {item.important ? (
                                            <span className={styles.important_tag}>
                                                {intl.formatMessage(messages.important)}
                                            </span>
                                        ) : null}
                                        {item.title}
                                    </div>
                                    <div className={styles.item_text}>{renderInline(item.text)}</div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </React.Fragment>
        );
    }

    renderUpdateNotes (offer, text) {
        const intl = this.props.intl;
        const key = `update-${offer.version}`;
        const open = this.state.expanded[key];
        const count = SECTIONS.reduce((sum, section) => sum + text.sections[section].length, 0);
        return (
            <React.Fragment>
                <button
                    type="button"
                    className={classNames(styles.release_toggle, styles.update_notes_toggle)}
                    aria-expanded={Boolean(open)}
                    onClick={() => this.toggleRelease(key)}
                >
                    <span
                        className={classNames(styles.release_chevron, {[styles.release_chevron_open]: open})}
                        aria-hidden="true"
                    >{'›'}</span>
                    <span className={styles.release_name}>{intl.formatMessage(messages.changesCount, {count})}</span>
                </button>
                {open ? this.renderNotes(text) : null}
            </React.Fragment>
        );
    }

    renderUpdate (offer, lang) {
        const intl = this.props.intl;
        const isAlpha = offer.channel === 'alpha';
        return (
            <section
                key={`update-${offer.channel}`}
                className={classNames(styles.release, styles.update, {[styles.update_alpha]: isAlpha})}
            >
                <h3 className={styles.release_title}>
                    <span>
                        {intl.formatMessage(isAlpha ? messages.updateAlpha : messages.updateAvailable,
                            {version: offer.version})}
                    </span>
                    <span className={styles.release_date}>{offer.date}</span>
                </h3>
                {isAlpha ? <p className={styles.alpha_hint}>{intl.formatMessage(messages.alphaHint)}</p> : null}
                <button
                    type="button"
                    id={`whats-new-update-${offer.channel}`}
                    className={classNames(formStyles.action_button, styles.update_button)}
                    onClick={() => this.handleUpdate(offer)}
                >
                    {intl.formatMessage(this.props.canInstall ? messages.updateNow : messages.download)}
                </button>
                {offer.notes && offer.notes[lang] ? this.renderUpdateNotes(offer, offer.notes[lang]) : null}
            </section>
        );
    }

    toggleRelease (version) {
        this.setState(state => ({expanded: Object.assign({}, state.expanded, {[version]: !state.expanded[version]})}));
    }

    renderRelease (release, lang, from, collapsible) {
        const intl = this.props.intl;
        const text = release[lang];
        const open = !collapsible || this.state.expanded[release.version];
        const count = SECTIONS.reduce((sum, key) => sum + text.sections[key].length, 0);
        const heading = (
            <React.Fragment>
                <span className={styles.release_name}>
                    {from ?
                        intl.formatMessage(messages.versionRange, {from, to: release.version}) :
                        intl.formatMessage(messages.version, {version: release.version})}
                    {isTestVersion(release.version) ? (
                        <span className={styles.test_tag}>{intl.formatMessage(messages.testTag)}</span>
                    ) : null}
                </span>
                <span className={styles.release_date}>
                    {collapsible && !open ? `${intl.formatMessage(messages.changesCount, {count})} · ` : ''}
                    {release.date}
                </span>
            </React.Fragment>
        );
        return (
            <section
                key={release.version}
                className={classNames(styles.release, {[styles.release_collapsed]: !open})}
            >
                {collapsible ? (
                    <h3 className={styles.release_title}>
                        <button
                            type="button"
                            className={styles.release_toggle}
                            aria-expanded={Boolean(open)}
                            onClick={() => this.toggleRelease(release.version)}
                        >
                            <span
                                className={classNames(styles.release_chevron, {[styles.release_chevron_open]: open})}
                                aria-hidden="true"
                            >{'›'}</span>
                            {heading}
                        </button>
                    </h3>
                ) : (
                    <h3 className={styles.release_title}>{heading}</h3>
                )}
                {open ? this.renderNotes(text) : null}
            </section>
        );
    }

    render () {
        const {data, showAll, intl, updates, current, updateCheckSupported} = this.props;
        if (!data && !updates.length && !updateCheckSupported) return null;
        const {unread, sinceVersion} = this.state;
        const lang = whatsNewLanguage(this.props.locale);
        const allReleases = data ? data.releases : [];
        let releases = allReleases;
        if (unread.length) {
            releases = unread;
        } else if (!showAll) {
            releases = allReleases.slice(0, 1);
        }
        const canShowAll = !unread.length && !showAll && allReleases.length > 1;
        // each release starts at its base; the oldest unread one — at the version the user last opened
        const oldest = releases[releases.length - 1];
        const fromOf = release => ((unread.length && release === oldest && sinceVersion) || release.from || '');
        return (
            <div
                id="whats-new-window"
                className={classNames(sharedStyles.palette, styles.whats_new_window)}
            >
                <div className={sharedStyles.header}>
                    <span className={sharedStyles.headerTitle}>{intl.formatMessage(messages.title)}</span>
                    <button
                        type="button"
                        className={sharedStyles.closeButton}
                        aria-label={intl.formatMessage(closeMessage)}
                        title={intl.formatMessage(closeMessage)}
                        onClick={this.handleClose}
                    />
                </div>
                <div className={classNames(sharedStyles.body, styles.content)}>
                    {updates.map(offer => this.renderUpdate(offer, lang))}
                    {!updates.length && updateCheckSupported && current && this.props.updateCheckEnabled ? (
                        <p className={styles.up_to_date}>{intl.formatMessage(messages.upToDate, {version: current})}</p>
                    ) : null}
                    {releases.map(release => this.renderRelease(release, lang, fromOf(release), releases.length > 1))}
                    {canShowAll ? (
                        <button
                            type="button"
                            id="whats-new-show-all"
                            className={classNames(formStyles.action_button, styles.show_all)}
                            onClick={this.props.onShowAll}
                        >
                            {intl.formatMessage(messages.showAll)}
                        </button>
                    ) : null}
                </div>
                <div className={classNames(formStyles.footer, styles.footer)}>
                    <div className={classNames(formStyles.footer_actions, styles.footer_actions)}>
                        {updateCheckSupported ? (
                            <label className={styles.check_updates}>
                                <input
                                    type="checkbox"
                                    id="whats-new-check-updates"
                                    checked={this.props.updateCheckEnabled}
                                    onChange={this.handleCheckUpdatesChange}
                                />
                                <span>{intl.formatMessage(messages.checkUpdates)}</span>
                            </label>
                        ) : null}
                        <button
                            type="button"
                            id="whats-new-ok"
                            className={classNames(formStyles.action_button, formStyles.footer_action_button)}
                            onClick={this.handleClose}
                        >
                            {intl.formatMessage(messages.ok)}
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

const releaseShape = PropTypes.shape({
    version: PropTypes.string.isRequired,
    date: PropTypes.string,
    from: PropTypes.string,
    important: PropTypes.bool,
    ru: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    en: PropTypes.object.isRequired // eslint-disable-line react/forbid-prop-types
});

WhatsNewWindowComponent.propTypes = {
    canInstall: PropTypes.bool,
    current: PropTypes.string,
    data: PropTypes.shape({
        current: PropTypes.string.isRequired,
        releases: PropTypes.arrayOf(releaseShape).isRequired
    }),
    onInstall: PropTypes.func.isRequired,
    onSetUpdateCheck: PropTypes.func.isRequired,
    updateCheckEnabled: PropTypes.bool,
    updateCheckSupported: PropTypes.bool,
    updates: PropTypes.arrayOf(PropTypes.shape({
        channel: PropTypes.string.isRequired,
        version: PropTypes.string.isRequired,
        date: PropTypes.string,
        downloadUrl: PropTypes.string.isRequired,
        downloadUrls: PropTypes.arrayOf(PropTypes.string),
        notes: PropTypes.object // eslint-disable-line react/forbid-prop-types
    })),
    intl: intlShape.isRequired,
    isShowing: PropTypes.bool,
    locale: PropTypes.string,
    onClose: PropTypes.func.isRequired,
    onSeen: PropTypes.func.isRequired,
    onShowAll: PropTypes.func.isRequired,
    showAll: PropTypes.bool,
    sinceVersion: PropTypes.string,
    unread: PropTypes.arrayOf(releaseShape)
};

const mapStateToProps = state => {
    const w = state.scratchGui.new_draggable_window[WHATS_NEW_WINDOW_ID];
    return {
        data: state.scratchGui.whats_new.data,
        current: state.scratchGui.whats_new.current,
        updates: state.scratchGui.whats_new.updates,
        updateCheckSupported: state.scratchGui.whats_new.updateCheckSupported,
        updateCheckEnabled: state.scratchGui.whats_new.updateCheckEnabled,
        canInstall: Boolean(state.scratchGui.license && hasPremiumAutoUpdateCapability(state.scratchGui.license)),
        unread: state.scratchGui.whats_new.unread,
        sinceVersion: state.scratchGui.whats_new.sinceVersion,
        showAll: state.scratchGui.whats_new.showAll,
        isShowing: Boolean(w && w.isShowing),
        locale: state.locales.locale
    };
};

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(ActionTriggerNewDraggableWindow(WHATS_NEW_WINDOW_ID)),
    onSeen: version => dispatch(whatsNewSeen(version)),
    onShowAll: () => dispatch(whatsNewShowAll()),
    onSetUpdateCheck: enabled => dispatch(setUpdateCheckThunk(enabled)),
    onInstall: offer => dispatch(premiumDownloadAndInstallThunk({
        downloadUrl: offer.downloadUrl,
        latestVersion: offer.version
    }))
});

export default injectIntl(connect(mapStateToProps, mapDispatchToProps)(WhatsNewWindowComponent));
