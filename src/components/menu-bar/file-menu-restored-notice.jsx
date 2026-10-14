import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {injectIntl, intlShape} from 'react-intl';

import {setRestoredDraft} from '../../reducers/project-save-status';
import {
    formatDateTime,
    mapStatusStateToProps,
    messages,
    saveShortcutLabel
} from '../../lib/project-save-status-text';

import styles from './file-menu-save.css';

/** The notice hides by itself after this time (ms), unless the pointer is over it. */
const RESTORED_NOTICE_MS = 10000;

/** "Opened the draft … from 14:32" under the "File" button at start. */
class FileMenuRestoredNoticeComponent extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleClose',
            'handleMouseEnter',
            'handleMouseLeave',
            'handleNoticeMouseEvent'
        ]);
        this.timer = null;
    }
    componentDidMount () {
        if (this.props.restoredDraft) this.startTimer(RESTORED_NOTICE_MS);
    }
    componentDidUpdate (prevProps) {
        if (this.props.restoredDraft !== prevProps.restoredDraft) {
            if (this.props.restoredDraft) {
                this.startTimer(RESTORED_NOTICE_MS);
            } else {
                this.stopTimer();
            }
        }
        // The open menu covers the notice and shows the same status.
        if (this.props.restoredDraft && this.props.isFileMenuOpen && !prevProps.isFileMenuOpen) {
            this.handleClose();
        }
    }
    componentWillUnmount () {
        this.stopTimer();
    }
    startTimer (delay) {
        this.stopTimer();
        this.timer = setTimeout(this.handleClose, delay);
    }
    stopTimer () {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
    handleClose () {
        this.stopTimer();
        this.props.onClose();
    }
    handleMouseEnter () {
        this.stopTimer();
    }
    handleMouseLeave () {
        this.startTimer(RESTORED_NOTICE_MS / 2);
    }
    handleNoticeMouseEvent (event) {
        // The notice sits inside the "File" button: clicks on it must not open the menu.
        event.stopPropagation();
    }
    render () {
        const {intl, restoredDraft, targetKind, targetName} = this.props;
        if (!restoredDraft) return null;
        const time = restoredDraft.savedAt ? formatDateTime(intl, restoredDraft.savedAt) : '';
        const title = (restoredDraft.title || '').trim();
        return (
            <div
                className={styles.notice}
                role="status"
                onClick={this.handleNoticeMouseEvent}
                onMouseDown={this.handleNoticeMouseEvent}
                onMouseEnter={this.handleMouseEnter}
                onMouseLeave={this.handleMouseLeave}
                onMouseUp={this.handleNoticeMouseEvent}
            >
                <div className={styles.noticeText}>
                    <div className={styles.noticeTitle}>
                        {title ?
                            intl.formatMessage(messages.restoredDraft, {title, time}) :
                            intl.formatMessage(messages.restoredDraftUntitled, {time})}
                    </div>
                    <div>
                        {intl.formatMessage(messages.restoredDraftHint, {shortcut: saveShortcutLabel()})}
                    </div>
                    {targetKind !== 'cloud' && targetName ? (
                        <div className={styles.noticeFile}>
                            {intl.formatMessage(messages.targetFile, {name: targetName})}
                        </div>
                    ) : null}
                </div>
                <button
                    aria-label={intl.formatMessage(messages.closeNotice)}
                    className={styles.noticeClose}
                    title={intl.formatMessage(messages.closeNotice)}
                    type="button"
                    onClick={this.handleClose}
                >
                    {'×'}
                </button>
            </div>
        );
    }
}

FileMenuRestoredNoticeComponent.propTypes = {
    intl: intlShape.isRequired,
    isFileMenuOpen: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    restoredDraft: PropTypes.shape({
        savedAt: PropTypes.number,
        title: PropTypes.string
    }),
    targetKind: PropTypes.string,
    targetName: PropTypes.string
};

const mapNoticeDispatchToProps = dispatch => ({
    onClose: () => dispatch(setRestoredDraft(null))
});

export default injectIntl(connect(
    mapStatusStateToProps,
    mapNoticeDispatchToProps
)(FileMenuRestoredNoticeComponent));
