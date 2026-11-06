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
    whatsNewSeen
} from './reducers/whats_new';
import {premiumDownloadAndInstallThunk} from './actions/licenseActions';
import {hasPremiumAutoUpdateCapability} from '../lib/licensing/capabilityGateway';
import {whatsNewLanguage} from '../lib/whats-new-state';
import {openExternalUrl} from '../lib/platform';
import {resolveDownloadUrl} from '../lib/update-check';
import {closeMessage} from './sensor-type-messages';

const messages = defineMessages({
    title: {
        id: 'gui.RobboMenu.trigger_whats_new',
        defaultMessage: 'What\'s new'
    },
    unread: {
        id: 'gui.RobboMenu.whats_new_unread',
        defaultMessage: 'There are new changes'
    },
    important: {
        id: 'gui.WhatsNew.important',
        defaultMessage: 'Important'
    },
    installed: {
        id: 'gui.WhatsNew.installed',
        defaultMessage: 'installed'
    },
    earlyAccess: {
        id: 'gui.WhatsNew.early_access',
        defaultMessage: 'Early access to updates'
    },
    available: {
        id: 'gui.WhatsNew.update_available',
        defaultMessage: 'Version {version} is available'
    },
    forYou: {
        id: 'gui.WhatsNew.tab_for_you',
        defaultMessage: 'For you'
    },
    allVersions: {
        id: 'gui.WhatsNew.tab_all',
        defaultMessage: 'All versions'
    },
    Devices: {
        id: 'gui.WhatsNew.topic_devices',
        defaultMessage: 'Devices'
    },
    Projects: {
        id: 'gui.WhatsNew.topic_projects',
        defaultMessage: 'Projects'
    },
    Copter: {
        id: 'gui.WhatsNew.topic_copter',
        defaultMessage: 'Copter'
    },
    App: {
        id: 'gui.WhatsNew.topic_app',
        defaultMessage: 'Program'
    },
    ok: {
        id: 'gui.WhatsNew.ok',
        defaultMessage: 'Got it'
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
    }
});

const SECTIONS = ['added', 'changed', 'fixed'];

/** Groups of the «For you» tab, in order. */
const TOPICS = ['Devices', 'Projects', 'Copter', 'App'];

/** 3.138.0-alpha → 3.138.0: the channel is shown by a badge */
const shortVersion = version => version.replace(/-.*$/, '');

/** @returns {Array<object>} items of a release as one list, [Important] first */
const flatItems = text => {
    const items = SECTIONS.reduce((all, section) => all.concat(text.sections[section]), []);
    return items.filter(item => item.important).concat(items.filter(item => !item.important));
};

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
        this.handleShowForYou = this.handleShowForYou.bind(this);
        this.handleShowAll = this.handleShowAll.bind(this);
        // unread at the moment the window opened: closing marks it read, but the fading window keeps it
        this.state = {wasShowing: false, unread: [], sinceVersion: '', showAll: false};
    }

    static getDerivedStateFromProps (props, state) {
        if (props.isShowing && !state.wasShowing) {
            return {
                wasShowing: true,
                unread: props.unread,
                sinceVersion: props.sinceVersion,
                showAll: false
            };
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

    handleShowForYou () {
        this.setState({showAll: false});
    }

    handleShowAll () {
        this.setState({showAll: true});
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

    /** @returns {React.Element} the offered version: a stable one first, the alpha as a quiet link beside it */
    renderUpdate () {
        const {intl, updates, canInstall} = this.props;
        const main = updates.find(offer => offer.channel !== 'alpha') || updates[0];
        const alpha = updates.find(offer => offer.channel === 'alpha' && offer !== main);
        const earlyAccess = intl.formatMessage(messages.earlyAccess);
        return (
            <div className={styles.update}>
                <div className={styles.update_text}>
                    <div className={styles.update_title}>
                        {intl.formatMessage(messages.available, {version: shortVersion(main.version)})}
                        {main.channel === 'alpha' ? <span className={styles.channel_badge}>{'alpha'}</span> : null}
                        <span className={styles.date}>{main.date}</span>
                    </div>
                    {main.channel === 'alpha' ? <div className={styles.update_hint}>{earlyAccess}</div> : null}
                    {alpha ? (
                        <button
                            type="button"
                            id="whats-new-update-alpha"
                            className={styles.update_alpha_link}
                            onClick={() => this.handleUpdate(alpha)}
                        >
                            {`${earlyAccess}: ${shortVersion(alpha.version)}`}
                        </button>
                    ) : null}
                </div>
                <button
                    type="button"
                    id={`whats-new-update-${main.channel}`}
                    className={classNames(formStyles.action_button, styles.download, {
                        [styles.download_alpha]: main.channel === 'alpha'
                    })}
                    onClick={() => this.handleUpdate(main)}
                >
                    {intl.formatMessage(canInstall ? messages.updateNow : messages.download)}
                </button>
            </div>
        );
    }

    renderItem (item, index) {
        const intl = this.props.intl;
        return (
            <li
                key={index}
                className={classNames(styles.item, {[styles.item_important]: item.important})}
            >
                <strong>
                    {item.important ? `${intl.formatMessage(messages.important)}. ` : ''}
                    {`${item.title}:`}
                </strong>
                {' '}
                {renderInline(item.text)}
            </li>
        );
    }

    /**
     * @param {object} release version with its text in the UI language
     * @param {string} [release.from] version the changes start at, shown as «A → B»
     * @param {boolean} [release.unread] not read yet
     * @returns {React.Element} heading and items of a version
     */
    renderVersion ({version, date, from, text, unread}) {
        const intl = this.props.intl;
        const short = shortVersion(version);
        const items = text ? flatItems(text) : [];
        return (
            <section key={version}>
                <h3 className={styles.version_title}>
                    <span className={styles.version_name}>
                        {unread ? (
                            <span
                                className={styles.unread_dot}
                                role="img"
                                aria-label={intl.formatMessage(messages.unread)}
                            />
                        ) : null}
                        {from ? `${shortVersion(from) === short ? from : shortVersion(from)} → ${short}` : short}
                        {version === this.props.current ? (
                            <span className={styles.installed}>{intl.formatMessage(messages.installed)}</span>
                        ) : null}
                    </span>
                    <span className={styles.date}>{date}</span>
                </h3>
                {items.length ? (
                    <ul className={styles.items}>{items.map((item, index) => this.renderItem(item, index))}</ul>
                ) : null}
            </section>
        );
    }

    /**
     * @param {Array<object>} items unread items of every unread version
     * @returns {React.Element} what is new for this user: [Important] first, the rest by topic
     */
    renderForYou (items) {
        const intl = this.props.intl;
        const important = items.filter(item => item.important);
        const others = items.filter(item => !item.important);
        return (
            <React.Fragment>
                {important.length ? (
                    <ul className={styles.important_items}>
                        {important.map((item, index) => this.renderItem(item, index))}
                    </ul>
                ) : null}
                {TOPICS.map(topic => {
                    const inTopic = others.filter(item => (TOPICS.includes(item.topic) ? item.topic : 'App') === topic);
                    return inTopic.length ? (
                        <section key={topic}>
                            <h3 className={styles.topic_title}>{intl.formatMessage(messages[topic])}</h3>
                            <ul className={styles.items}>
                                {inTopic.map((item, index) => this.renderItem(item, index))}
                            </ul>
                        </section>
                    ) : null;
                })}
            </React.Fragment>
        );
    }

    renderTab (selected, label, onClick, count) {
        return (
            <button
                type="button"
                role="tab"
                aria-selected={selected}
                className={classNames(styles.tab, {[styles.tab_selected]: selected})}
                onClick={onClick}
            >
                {label}
                {count ? <span className={styles.tab_count}>{count}</span> : null}
            </button>
        );
    }

    render () {
        const {data, intl, updates, current, updateCheckSupported} = this.props;
        if (!data && !updates.length && !updateCheckSupported) return null;
        const {unread, sinceVersion} = this.state;
        const lang = whatsNewLanguage(this.props.locale);
        const releases = data ? data.releases : [];
        const oldestUnread = unread[unread.length - 1];
        // new features before fixes, whatever version they came with
        const unreadItems = SECTIONS.reduce((items, section) => unread.reduce((all, release) =>
            all.concat(release[lang].sections[section]), items), []);
        const forYou = unreadItems.length > 0 && !this.state.showAll;
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
                {updates.length ? this.renderUpdate() : null}
                {unreadItems.length ? (
                    <div
                        className={styles.tabs}
                        role="tablist"
                    >
                        {this.renderTab(forYou, intl.formatMessage(messages.forYou),
                            this.handleShowForYou, unreadItems.length)}
                        {this.renderTab(!forYou, intl.formatMessage(messages.allVersions), this.handleShowAll)}
                    </div>
                ) : null}
                <div
                    key={forYou ? 'for-you' : 'all'}
                    className={classNames(sharedStyles.body, styles.content)}
                >
                    {forYou ? this.renderForYou(unreadItems) : releases.map(release => this.renderVersion({
                        version: release.version,
                        date: release.date,
                        // the chain starts where the user left off
                        from: oldestUnread && release.version === oldestUnread.version ?
                            sinceVersion || release.from : '',
                        text: release[lang],
                        unread: unread.some(item => item.version === release.version)
                    }))}
                    {!releases.length && !updates.length && updateCheckSupported && current &&
                        this.props.updateCheckEnabled ? (
                            <p className={styles.up_to_date}>
                                {intl.formatMessage(messages.upToDate, {version: current})}
                            </p>
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
                            className={formStyles.action_button}
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
        isShowing: Boolean(w && w.isShowing),
        locale: state.locales.locale
    };
};

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(ActionTriggerNewDraggableWindow(WHATS_NEW_WINDOW_ID)),
    onSeen: version => dispatch(whatsNewSeen(version)),
    onSetUpdateCheck: enabled => dispatch(setUpdateCheckThunk(enabled)),
    onInstall: offer => dispatch(premiumDownloadAndInstallThunk({
        downloadUrl: offer.downloadUrl,
        latestVersion: offer.version
    }))
});

export default injectIntl(connect(mapStateToProps, mapDispatchToProps)(WhatsNewWindowComponent));
