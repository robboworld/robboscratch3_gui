import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {defineMessages, injectIntl, intlShape} from 'react-intl';

import styles from './DevicePaletteStatus.css';
import {getDeviceLinkKind, requestDeviceSearch} from './device-link-status';

const messages = defineMessages({
    ready: {
        id: 'gui.RobboGui.DeviceStatus.ready',
        description: 'Device palette: the device is connected',
        defaultMessage: 'connected'
    },
    connecting: {
        id: 'gui.RobboGui.DeviceStatus.connecting',
        description: 'Device palette: the port is open, the device is being identified',
        defaultMessage: 'connecting…'
    },
    searching: {
        id: 'gui.RobboGui.DeviceStatus.searching',
        description: 'Device palette: device search in progress',
        defaultMessage: 'searching…'
    },
    off: {
        id: 'gui.RobboGui.DeviceStatus.off',
        description: 'Device palette: no device connected',
        defaultMessage: 'not connected'
    },
    sim: {
        id: 'gui.RobboGui.DeviceStatus.sim',
        description: 'Device palette: the 2D simulator stands in for the device',
        defaultMessage: 'simulation'
    },
    find: {
        id: 'gui.RobboGui.DeviceStatus.find',
        description: 'Device palette: start the device search',
        defaultMessage: 'Search'
    },
    findBusy: {
        id: 'gui.RobboGui.DeviceStatus.findBusy',
        description: 'Device palette: the search button while devices are being searched',
        defaultMessage: 'Searching…'
    }
});

const POLL_MS = 300;

/**
 * Polls the connection state of a device palette (the DCA status callback has a single slot,
 * used by the menu bar).
 */
class DeviceLinkPoller extends Component {
    constructor (props) {
        super(props);
        this.state = {kind: this.readKind()};
    }

    componentDidMount () {
        this.timer = setInterval(() => {
            const kind = this.readKind();
            if (kind !== this.state.kind) this.setState({kind});
        }, POLL_MS);
    }

    componentWillUnmount () {
        clearInterval(this.timer);
    }

    readKind () {
        return getDeviceLinkKind(this.props.api, this.props.connectedKey, this.props.simulated);
    }

    currentKind () {
        return this.props.simulated ? 'sim' : this.state.kind;
    }
}

DeviceLinkPoller.propTypes = {
    api: PropTypes.object,
    connectedKey: PropTypes.string.isRequired,
    intl: intlShape.isRequired,
    simulated: PropTypes.bool
};

/**
 * Dot before the palette title: green — connected, yellow — searching, grey — not connected,
 * blue — the simulator. The state in words is in the tooltip.
 */
class StatusDot extends DeviceLinkPoller {
    render () {
        const kind = this.currentKind();
        const text = this.props.intl.formatMessage(messages[kind]);
        return (
            <span
                className={classNames(styles.dot, styles[`dot_${kind}`])}
                title={text}
                role="img"
                aria-label={text}
            />
        );
    }
}

/** Feedback right after a click, before the API reports the search. */
const CLICK_BUSY_MS = 3000;

/**
 * Wide "Search" button under the header while the device is not connected: the one thing to do
 * without a device. While searching it is disabled and says "Searching…". Hidden once connected.
 */
class StatusLine extends DeviceLinkPoller {
    constructor (props) {
        super(props);
        this.handleSearch = this.handleSearch.bind(this);
    }

    handleSearch () {
        this.clickedAt = Date.now();
        this.forceUpdate();
        setTimeout(() => this.forceUpdate(), CLICK_BUSY_MS);
        requestDeviceSearch();
    }

    render () {
        const kind = this.currentKind();
        if (kind === 'ready' || kind === 'sim') return null;
        const busy = kind === 'searching' || kind === 'connecting' ||
            (this.clickedAt && Date.now() - this.clickedAt < CLICK_BUSY_MS);
        const {intl} = this.props;
        return (
            <div className={styles.statusLine}>
                <button
                    type="button"
                    className={classNames(styles.findButton, {[styles.findButtonBusy]: busy})}
                    disabled={busy}
                    aria-busy={busy}
                    onClick={this.handleSearch}
                >
                    {busy ? <span className={styles.spinner} aria-hidden="true" /> : null}
                    {intl.formatMessage(busy ? messages.findBusy : messages.find)}
                </button>
            </div>
        );
    }
}

const DevicePaletteStatusDot = injectIntl(StatusDot);

export {DevicePaletteStatusDot};
export default injectIntl(StatusLine);
