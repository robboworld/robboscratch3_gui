import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import classNames from 'classnames';

import sharedStyles from './DevicePaletteShared.css';
import formStyles from './RobboPaletteForm.css';
import styles from './WhatsNewWindowComponent.css';
import {ActionTriggerNewDraggableWindow} from './actions/sensor_actions';
import {WHATS_NEW_WINDOW_ID, whatsNewSeen, whatsNewShowAll} from './reducers/whats_new';
import {whatsNewLanguage} from '../lib/whats-new-state';
import {openExternalUrl} from '../lib/platform';
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
    }
});

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
        // unread at the moment the window opened: closing marks it read, but the fading window keeps it
        this.state = {wasShowing: false, unread: [], sinceVersion: ''};
    }

    static getDerivedStateFromProps (props, state) {
        if (props.isShowing && !state.wasShowing) {
            return {wasShowing: true, unread: props.unread, sinceVersion: props.sinceVersion};
        }
        if (!props.isShowing && state.wasShowing) return {wasShowing: false};
        return null;
    }

    componentDidUpdate (prevProps) {
        // closed by the button, the cross or Esc: everything up to this build is read
        if (prevProps.isShowing && !this.props.isShowing && this.props.data) {
            this.props.onSeen(this.props.data.current);
        }
    }

    handleClose () {
        this.props.onClose();
    }

    renderRelease (release, lang, from) {
        const intl = this.props.intl;
        const text = release[lang];
        return (
            <section
                key={release.version}
                className={styles.release}
            >
                <h3 className={styles.release_title}>
                    <span>
                        {from ?
                            intl.formatMessage(messages.versionRange, {from, to: release.version}) :
                            intl.formatMessage(messages.version, {version: release.version})}
                    </span>
                    <span className={styles.release_date}>{release.date}</span>
                </h3>
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
            </section>
        );
    }

    render () {
        const {data, showAll, intl} = this.props;
        if (!data) return null;
        const {unread, sinceVersion} = this.state;
        const lang = whatsNewLanguage(this.props.locale);
        let releases = data.releases;
        if (unread.length) {
            releases = unread;
        } else if (!showAll) {
            releases = data.releases.slice(0, 1);
        }
        const canShowAll = !unread.length && !showAll && data.releases.length > 1;
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
                    {releases.map(release => this.renderRelease(release, lang, fromOf(release)))}
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
    data: PropTypes.shape({
        current: PropTypes.string.isRequired,
        releases: PropTypes.arrayOf(releaseShape).isRequired
    }),
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
    onShowAll: () => dispatch(whatsNewShowAll())
});

export default injectIntl(connect(mapStateToProps, mapDispatchToProps)(WhatsNewWindowComponent));
