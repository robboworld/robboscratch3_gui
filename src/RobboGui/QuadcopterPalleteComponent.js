import classNames from 'classnames';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import sharedStyles from './DevicePaletteShared.css';
import styles from './QuadcopterPalleteComponent.css';
import RobboSelect from './RobboSelect';

import {ActionTriggerDraggableWindow} from './actions/sensor_actions';
import {getDefaultSimulationCopterSpriteJson} from '../lib/robbo-simulation-copter-sprite';
import {batteryColorLevel, copterColor} from '../lib/copter-colors';

import {defineMessages, injectIntl} from 'react-intl';
import {closeMessage} from './sensor-type-messages';

const messages = defineMessages({
    copters: {
        id: 'gui.RobboGui.QuadcopterPalette.copters',
        description: 'Copter palette title',
        defaultMessage: 'Copters'
    },
    group: {
        id: 'gui.RobboGui.QuadcopterPalette.group',
        description: 'Radio group (channel) of this computer',
        defaultMessage: 'Group {group}'
    },
    groupSetting: {
        id: 'gui.RobboGui.QuadcopterPalette.groupSetting',
        description: 'Toolbar menu: the radio group of this computer',
        defaultMessage: 'Group of this computer'
    },
    groupHint: {
        id: 'gui.RobboGui.QuadcopterPalette.groupHint',
        description: 'Why the radio group setting exists',
        defaultMessage: 'Needed when several computers with copters share a room: give each computer its own group and it sees only its copters. New copters are found from any group.'
    },
    search: {
        id: 'gui.RobboGui.QuadcopterPalette.search',
        description: 'Search copters of the group',
        defaultMessage: 'Search'
    },
    landAll: {
        id: 'gui.RobboGui.QuadcopterPalette.landAll',
        description: 'Land every connected copter',
        defaultMessage: 'Land all'
    },
    compactView: {
        id: 'gui.RobboGui.QuadcopterPalette.compactView',
        description: 'Switch to one line per copter',
        defaultMessage: 'Compact view'
    },
    detailedView: {
        id: 'gui.RobboGui.QuadcopterPalette.detailedView',
        description: 'Switch to detailed copter cards',
        defaultMessage: 'Detailed view'
    },
    useOnThisComputer: {
        id: 'gui.RobboGui.QuadcopterPalette.useOnThisComputer',
        description: 'Switch: this computer connects and commands the copter',
        defaultMessage: 'Use on this computer'
    },
    notUsedHere: {
        id: 'gui.RobboGui.QuadcopterPalette.notUsedHere',
        description: 'Copter switched off for this computer',
        defaultMessage: 'Not used on this computer'
    },
    copterNumber: {
        id: 'gui.RobboGui.QuadcopterPalette.copterNumber',
        description: 'Copter card title',
        defaultMessage: 'Copter {number}'
    },
    newCopter: {
        id: 'gui.RobboGui.QuadcopterPalette.newCopter',
        description: 'Factory copter without a number',
        defaultMessage: 'New copter'
    },
    newCopterWaiting: {
        id: 'gui.RobboGui.QuadcopterPalette.newCopterWaiting',
        description: 'Factory copter found, the number is assigned once it connects',
        defaultMessage: 'connecting — the number is assigned automatically'
    },
    attentionNoFreeNumbers: {
        id: 'gui.RobboGui.QuadcopterPalette.attentionNoFreeNumbers',
        description: 'All 15 numbers of the group are taken',
        defaultMessage: 'All numbers in the group are taken — switch the copter to another group'
    },
    attentionNumberedAsFactory: {
        id: 'gui.RobboGui.QuadcopterPalette.attentionNumberedAsFactory',
        description: 'A numbered copter answers on the factory address (its flight controller has not set the radio up)',
        defaultMessage: 'This is copter {number}: it answers as a new one — restart it'
    },
    attentionNumberFailed: {
        id: 'gui.RobboGui.QuadcopterPalette.attentionNumberFailed',
        description: 'Automatic number assignment failed',
        defaultMessage: 'Could not assign a number to the copter'
    },
    attentionAutoNumbered: {
        id: 'gui.RobboGui.QuadcopterPalette.attentionAutoNumbered',
        description: 'The new copter got a number automatically',
        defaultMessage: 'The new copter got number {number}. Turn new copters on one at a time'
    },
    retry: {
        id: 'gui.RobboGui.QuadcopterPalette.retry',
        description: 'Try the failed action again',
        defaultMessage: 'Retry'
    },
    changeNumber: {
        id: 'gui.RobboGui.QuadcopterPalette.changeNumber',
        description: 'Menu item: give the copter another number',
        defaultMessage: 'Change number'
    },
    factoryReset: {
        id: 'gui.RobboGui.QuadcopterPalette.factoryReset',
        description: 'Menu item: factory radio settings',
        defaultMessage: 'Restore factory settings…'
    },
    more: {
        id: 'gui.RobboGui.QuadcopterPalette.more',
        description: 'Copter card menu button',
        defaultMessage: 'More'
    },
    statusGround: {
        id: 'gui.RobboGui.QuadcopterPalette.statusGround',
        description: 'Copter status',
        defaultMessage: 'on the ground'
    },
    statusFlying: {
        id: 'gui.RobboGui.QuadcopterPalette.statusFlying',
        description: 'Copter status',
        defaultMessage: 'in flight'
    },
    statusSearching: {
        id: 'gui.RobboGui.QuadcopterPalette.statusSearching',
        description: 'Copter status',
        defaultMessage: 'connecting…'
    },
    statusLost: {
        id: 'gui.RobboGui.QuadcopterPalette.statusLost',
        description: 'Copter status',
        defaultMessage: 'no connection'
    },
    statusLocked: {
        id: 'gui.RobboGui.QuadcopterPalette.statusLocked',
        description: 'Copter status',
        defaultMessage: 'not responding'
    },
    statusTumbled: {
        id: 'gui.RobboGui.QuadcopterPalette.statusTumbled',
        description: 'Copter status',
        defaultMessage: 'flipped over'
    },
    restart: {
        id: 'gui.RobboGui.QuadcopterPalette.restart',
        description: 'Button that power-cycles a hung quadcopter through its radio',
        defaultMessage: 'Restart quadcopter'
    },
    attentionLocked: {
        id: 'gui.RobboGui.QuadcopterPalette.attentionLocked',
        description: 'Supervisor is locked: only a restart helps',
        defaultMessage: 'The quadcopter does not respond to commands — restart it'
    },
    attentionTumbled: {
        id: 'gui.RobboGui.QuadcopterPalette.attentionTumbled',
        description: 'Quadcopter is upside down or crashed',
        defaultMessage: 'The quadcopter has flipped over. Put it on the floor'
    },
    attentionRestarting: {
        id: 'gui.RobboGui.QuadcopterPalette.attentionRestarting',
        description: 'Restart in progress',
        defaultMessage: 'Restarting the quadcopter…'
    },
    attentionLinkLost: {
        id: 'gui.RobboGui.QuadcopterPalette.attentionLinkLost',
        description: 'Copter link lost',
        defaultMessage: 'Connection lost — press “Search”'
    },
    attentionNewFirmware: {
        id: 'gui.RobboGui.QuadcopterPalette.attentionNewFirmware',
        description: 'Copter firmware differs from the bundled one',
        defaultMessage: 'New firmware available'
    },
    attentionFirmwareFlightBlocked: {
        id: 'gui.RobboGui.QuadcopterPalette.attentionFirmwareFlightBlocked',
        description: 'Firmware update needs every copter on the ground',
        defaultMessage: 'Land all copters to update the firmware'
    },
    attentionFlashInterrupted: {
        id: 'gui.RobboGui.QuadcopterPalette.attentionFlashInterrupted',
        description: 'Previous firmware update did not finish; the copter is likely in the bootloader',
        defaultMessage: 'The firmware update was interrupted. Press “Update”, then switch the quadcopter off and on'
    },
    attentionRenumbering: {
        id: 'gui.RobboGui.QuadcopterPalette.attentionRenumbering',
        description: 'Number is being written into the copter',
        defaultMessage: 'Assigning the number — the copter restarts…'
    },
    update: {
        id: 'gui.RobboGui.QuadcopterPalette.update',
        description: 'Starts the firmware update',
        defaultMessage: 'Update'
    },
    flashCloseBlocked: {
        id: 'gui.RobboGui.QuadcopterPalette.flashCloseBlocked',
        description: 'Shown when the user tries to close the app during a quadcopter firmware update',
        defaultMessage: 'Wait until the quadcopter firmware update finishes: if you close the program now, the quadcopter will stop starting'
    },
    addCopter: {
        id: 'gui.RobboGui.QuadcopterPalette.addCopter',
        description: 'Simulator: add another copter sprite',
        defaultMessage: 'Add copter'
    },
    noCopters: {
        id: 'gui.RobboGui.QuadcopterPalette.noCopters',
        description: 'No copter found in the group',
        defaultMessage: 'No copters found. Switch them on and press “Search”.'
    },
    attentionNoChargeToFly: {
        id: 'gui.RobboGui.QuadcopterPalette.attentionNoChargeToFly',
        description: 'On the ground: the charge is not enough for a flight, flight blocks are refused',
        defaultMessage: 'Not enough charge to fly — charge the battery'
    },
    attentionLowBattery: {
        id: 'gui.RobboGui.QuadcopterPalette.attentionLowBattery',
        description: 'Battery warning or critical',
        defaultMessage: 'Low battery — put the copter on charge'
    },
    volts: {
        id: 'gui.RobboGui.QuadcopterPalette.volts',
        description: 'Battery voltage on a copter card (detailed view)',
        defaultMessage: '{volts} V'
    },
    battery: {
        id: 'gui.RobboGui.QuadcopterPalette.battery',
        description: 'Copter menu: battery capacity (sets the flight time of a full battery)',
        defaultMessage: 'Battery'
    },
    batteryMah: {
        id: 'gui.RobboGui.QuadcopterPalette.batteryMah',
        description: 'Battery capacity option',
        defaultMessage: '{mah} mAh'
    },
    powerOff: {
        id: 'gui.RobboGui.QuadcopterPalette.powerOff',
        description: 'Menu item: switch the copter off by radio',
        defaultMessage: 'Switch off'
    },
    minutesLeft: {
        id: 'gui.RobboGui.QuadcopterPalette.minutesLeft',
        description: 'Remaining flight time',
        defaultMessage: '~{minutes} min'
    },
    identify: {
        id: 'gui.RobboGui.QuadcopterPalette.identify',
        description: 'Blink the copter LEDs',
        defaultMessage: 'Blink — shows which copter this is'
    },
    attentionWeakLink: {
        id: 'gui.RobboGui.QuadcopterPalette.attentionWeakLink',
        description: 'Link quality below 50 %',
        defaultMessage: 'Weak connection — move the Crazyradio closer'
    },
    attentionLostInAir: {
        id: 'gui.RobboGui.QuadcopterPalette.attentionLostInAir',
        description: 'Link lost while flying: the copter hovers by itself and is searched again',
        defaultMessage: 'Connection lost in flight — the copter hovers by itself, searching…'
    },
    swarmHint: {
        id: 'gui.RobboGui.QuadcopterPalette.swarmHint',
        description: 'Shown before a swarm takes off: how to place the copters',
        defaultMessage: 'Before a swarm flight: noses in one direction, at least 1 m apart, a floor with a pattern — over a plain floor the copters drift'
    },
    attentionLostInAirLanding: {
        id: 'gui.RobboGui.QuadcopterPalette.attentionLostInAirLanding',
        description: 'Link lost while flying; the landing sent at the loss got through',
        defaultMessage: 'Connection lost in flight — the copter is landing, searching…'
    },
    attentionWeakLinkLanding: {
        id: 'gui.RobboGui.QuadcopterPalette.attentionWeakLinkLanding',
        description: 'The copter is landed because the radio link stayed weak',
        defaultMessage: 'Weak connection — the copter is landing'
    },
    attentionLandedAfterLinkLoss: {
        id: 'gui.RobboGui.QuadcopterPalette.attentionLandedAfterLinkLoss',
        description: 'The link was lost in flight; after reconnecting the copter was landed',
        defaultMessage: 'The connection was lost in flight — the copter was landed'
    },
    attentionLowBatteryLanding: {
        id: 'gui.RobboGui.QuadcopterPalette.attentionLowBatteryLanding',
        description: 'The copter is landed because the battery is empty',
        defaultMessage: 'Battery empty — the copter is landing'
    },
    attentionReconnecting: {
        id: 'gui.RobboGui.QuadcopterPalette.attentionReconnecting',
        description: 'Lost copter is being searched again automatically',
        defaultMessage: 'Connection lost — searching for the copter…'
    },
    readyToFly: {
        id: 'gui.RobboGui.QuadcopterPalette.readyToFly',
        description: 'Readiness mark tooltip',
        defaultMessage: 'Ready to fly'
    },
    needsAttention: {
        id: 'gui.RobboGui.QuadcopterPalette.needsAttention',
        description: 'Readiness mark tooltip',
        defaultMessage: 'Needs attention'
    },
    cannotFly: {
        id: 'gui.RobboGui.QuadcopterPalette.cannotFly',
        description: 'Readiness mark tooltip',
        defaultMessage: 'Cannot fly'
    },
    linkQuality: {
        id: 'gui.RobboGui.QuadcopterPalette.linkQuality',
        description: 'Link quality tooltip',
        defaultMessage: 'Connection {quality} %'
    },
    summary: {
        id: 'gui.RobboGui.QuadcopterPalette.summary',
        description: 'Copter palette summary line',
        defaultMessage: 'Ready {ready} of {total} · in flight {flying} · min. {battery} %'
    },
    findLost: {
        id: 'gui.RobboGui.QuadcopterPalette.findLost',
        description: 'Scan every radio channel for copters of other groups',
        defaultMessage: 'Find lost copters'
    },
    lostSearching: {
        id: 'gui.RobboGui.QuadcopterPalette.lostSearching',
        description: 'Channel scan in progress',
        defaultMessage: 'Searching all channels…'
    },
    lostNone: {
        id: 'gui.RobboGui.QuadcopterPalette.lostNone',
        description: 'Channel scan found nothing',
        defaultMessage: 'No copters found on other channels'
    },
    lostFound: {
        id: 'gui.RobboGui.QuadcopterPalette.lostFound',
        description: 'Copter found on another channel',
        defaultMessage: '{name} on channel {channel}'
    },
    adopt: {
        id: 'gui.RobboGui.QuadcopterPalette.adopt',
        description: 'Move a found copter to this computer group',
        defaultMessage: 'Move to my group'
    },
    groupLocked: {
        id: 'gui.RobboGui.QuadcopterPalette.groupLocked',
        description: 'The group cannot be changed while a copter flies',
        defaultMessage: 'Land the copters to change the group'
    },
    copterSettings: {
        id: 'gui.RobboGui.QuadcopterPalette.copterSettings',
        description: 'Copter card menu title',
        defaultMessage: 'Copter settings'
    },
    paletteSettings: {
        id: 'gui.RobboGui.QuadcopterPalette.paletteSettings',
        description: 'Toolbar menu title',
        defaultMessage: 'Settings'
    },
    needsConnection: {
        id: 'gui.RobboGui.QuadcopterPalette.needsConnection',
        description: 'Why a copter menu item is disabled',
        defaultMessage: 'Available when the copter is connected and on the ground'
    },
    numberLabel: {
        id: 'gui.RobboGui.QuadcopterPalette.numberLabel',
        description: 'Copter menu: the number of the copter (choose another to renumber)',
        defaultMessage: 'Number'
    },
    factoryResetConfirm: {
        id: 'gui.RobboGui.QuadcopterPalette.factoryResetConfirm',
        description: 'Asked before the factory reset',
        defaultMessage: 'The copter forgets its number and group. Reset?'
    },
    resetYes: {
        id: 'gui.RobboGui.QuadcopterPalette.resetYes',
        description: 'Confirms the factory reset',
        defaultMessage: 'Reset'
    },
    cancel: {
        id: 'gui.RobboGui.QuadcopterPalette.cancel',
        description: 'Cancels the factory reset',
        defaultMessage: 'Cancel'
    },
    searching: {
        id: 'gui.RobboGui.QuadcopterPalette.searching',
        description: 'Search button while copters are being searched',
        defaultMessage: 'Searching…'
    },
    powerOffConfirm: {
        id: 'gui.RobboGui.QuadcopterPalette.powerOffConfirm',
        description: 'Asked before switching a copter off by radio',
        defaultMessage: 'Switch off copter {number}? It is switched on again only with its own button.'
    },
    powerOffYes: {
        id: 'gui.RobboGui.QuadcopterPalette.powerOffYes',
        description: 'Confirms switching the copter off',
        defaultMessage: 'Switch off'
    },
    land: {
        id: 'gui.RobboGui.QuadcopterPalette.land',
        description: 'Land the only connected copter',
        defaultMessage: 'Land'
    },
    meters: {
        id: 'gui.RobboGui.QuadcopterPalette.meters',
        description: ' ',
        defaultMessage: 'm.'
    }
});

const COMPACT_STORAGE_KEY = 'robbo.copter.paletteCompact';
const WEAK_LINK_PERCENT = 50;
/** Full battery flight time, same as the DCA battery policy and the simulator. */
const FULL_BATTERY_FLIGHT_MINUTES = 6;
const START_POSES_STORAGE_KEY = 'robbo.copter.startPoses';
/** Default start points: copters in a row, 0.6 m apart. */
const START_POSE_SPACING_M = 0.6;
const MAP_WIDTH = 300;
const MAP_HEIGHT = 140;
const MAP_GRID_M = 0.5;

const readStartPoses = () => {
    try {
        return JSON.parse(window.localStorage.getItem(START_POSES_STORAGE_KEY) || '{}') || {};
    } catch (e) {
        return {};
    }
};

const writeStartPoses = poses => {
    try {
        window.localStorage.setItem(START_POSES_STORAGE_KEY, JSON.stringify(poses));
    } catch (e) {
        // Session only.
    }
};
const SIM_POLL_MS = 100;

const readCompact = () => {
    try {
        return window.localStorage.getItem(COMPACT_STORAGE_KEY) === '1';
    } catch (e) {
        return false;
    }
};

const writeCompact = value => {
    try {
        window.localStorage.setItem(COMPACT_STORAGE_KEY, value ? '1' : '0');
    } catch (e) {
        // Per-session preference only.
    }
};

/** `menuFor` value of the toolbar ⋯ menu (cards use their copter id). */
const TOOLBAR_MENU = 'toolbar';
const NOTICE_RANK = {danger: 0, warning: 1, info: 2};

/**
 * Two decimals; a tiny negative drift is shown as 0.00, not -0.00.
 * @param {number} value metres
 * @returns {string} formatted value
 */
const formatCoord = value => {
    const rounded = Math.round((Number(value) || 0) * 100) / 100;
    return (rounded === 0 ? 0 : rounded).toFixed(2);
};

class QuadcopterPalleteComponent extends Component {
    constructor (props) {
        super(props);
        this.state = {
            simulated: false,
            copters: [],
            simCopters: [],
            compact: readCompact(),
            menuFor: null,
            confirmReset: null,
            confirmPowerOff: null,
            renumbering: {},
            startPoses: readStartPoses(),
            lost: null
        };
        this.handleCopterList = this.handleCopterList.bind(this);
        this.handleFindLost = this.handleFindLost.bind(this);
        this.handleMapPointerMove = this.handleMapPointerMove.bind(this);
        this.handleMapPointerUp = this.handleMapPointerUp.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        this.handleLandAll = this.handleLandAll.bind(this);
        this.handleToggleCompact = this.handleToggleCompact.bind(this);
        this.handleGroupChange = this.handleGroupChange.bind(this);
        this.handleAddSimCopter = this.handleAddSimCopter.bind(this);
        this.handleRecoverFirmware = this.handleRecoverFirmware.bind(this);
        this.handleDocumentMouseDown = this.handleDocumentMouseDown.bind(this);
        this.handleDocumentKeyDown = this.handleDocumentKeyDown.bind(this);
        this.setMenuRef = this.setMenuRef.bind(this);
    }

    componentDidMount () {
        const QCA = this.props.QCA;
        if (QCA && typeof QCA.subscribeCopters === 'function') {
            this.unsubscribeCopters = QCA.subscribeCopters(this.handleCopterList);
        }
        this.syncSimulator();
        this.simTimer = setInterval(() => this.syncSimulator(), SIM_POLL_MS);
        document.addEventListener('mousedown', this.handleDocumentMouseDown);
        document.addEventListener('keydown', this.handleDocumentKeyDown);
    }

    componentWillUnmount () {
        if (this.unsubscribeCopters) this.unsubscribeCopters();
        if (this.simTimer) clearInterval(this.simTimer);
        document.removeEventListener('mousedown', this.handleDocumentMouseDown);
        document.removeEventListener('keydown', this.handleDocumentKeyDown);
        this.handleMapPointerUp();
    }

    handleCopterList (copters) {
        const list = copters || [];
        this.setState(state => ({
            copters: list,
            // The copter got another number or vanished: its menu has nothing to act on.
            menuFor: state.menuFor === null || state.menuFor === TOOLBAR_MENU ||
                list.some(c => c.id === state.menuFor && c.enabled && !c.isNew) ? state.menuFor : null
        }));
    }

    setMenuRef (element) {
        this.menuElement = element;
    }

    /**
     * A click outside the open menu closes it (the ⋯ buttons toggle it themselves).
     * @param {MouseEvent} event mousedown anywhere in the document
     */
    handleDocumentMouseDown (event) {
        if (this.state.menuFor === null) return;
        const target = event.target;
        if (this.menuElement && this.menuElement.contains(target)) return;
        // RobboSelect renders its list in a portal outside the menu.
        if (target && target.closest && target.closest('[data-copter-menu-toggle], [role="listbox"]')) return;
        this.setState({menuFor: null, confirmReset: null});
    }

    /**
     * Escape closes an open ⋯ menu first; the palette itself closes on the next Escape.
     * @param {KeyboardEvent} event keydown
     */
    handleDocumentKeyDown (event) {
        if (event.key !== 'Escape' || this.state.menuFor === null) return;
        if (document.querySelector('[role="listbox"]')) return;
        event.preventDefault();
        this.setState({menuFor: null, confirmReset: null});
    }

    toggleMenu (menuFor) {
        this.setState(state => ({menuFor: state.menuFor === menuFor ? null : menuFor, confirmReset: null}));
    }

    handleFindLost () {
        this.setState({lost: {searching: true, list: []}});
        this.props.QCA.findLostCopters().then(list => {
            this.setState({lost: {searching: false, list: list || []}});
        });
    }

    handleAdopt (lost) {
        this.setState(state => ({
            lost: Object.assign({}, state.lost, {list: state.lost.list.filter(item => item !== lost)})
        }));
        this.props.QCA.adoptLostCopter(lost);
    }

    startPoseKey (copter) {
        return `${this.props.QCA.getRadioGroup()}:${copter.id}`;
    }

    startPoseOf (copter) {
        const stored = this.state.startPoses[this.startPoseKey(copter)];
        if (stored) return stored;
        const index = copter.number ? copter.number - 1 : 15;
        return {x: index * START_POSE_SPACING_M, y: 0};
    }

    /** Simulator copters are VM controllers; the palette reads their state like the stage does. */
    syncSimulator () {
        const runtime = this.props.VM && this.props.VM.runtime;
        const blocks = runtime && runtime._copterBlocks;
        const simulated = Boolean(runtime && runtime.sim_copter_ac && blocks);
        if (!simulated) {
            if (this.state.simulated) this.setState({simulated: false, simCopters: []});
            return;
        }
        const simCopters = blocks.getSimControllers().map(controller => {
            if (typeof controller._syncFromSpritePositionIfNeeded === 'function') {
                controller._syncFromSpritePositionIfNeeded();
            }
            return {
                id: controller.simNumber,
                number: controller.simNumber,
                originX: controller.sim_origin_x,
                originY: controller.sim_origin_y,
                yaw: controller.sim_yaw,
                flying: controller.sim_is_flying === true,
                batteryPercent: controller.sim_battery,
                x: controller.sim_x,
                y: controller.sim_y,
                z: controller.sim_z
            };
        });
        this.setState({simulated: true, simCopters});
    }

    handleSearch () {
        this.props.QCA.searchQuadcopterDevices();
    }

    handleLandAll () {
        this.props.QCA.landAllCopters();
    }

    handleToggleCompact () {
        const compact = !this.state.compact;
        writeCompact(compact);
        this.setState({compact});
    }

    handleGroupChange (event) {
        const group = Number(event.target.value);
        this.props.QCA.setRadioGroup(group).then(changed => {
            if (changed) {
                // Found channels are relative to the old group.
                this.setState({lost: null});
                this.props.QCA.searchQuadcopterDevices();
            }
            this.forceUpdate();
        });
    }

    handleToggleEnabled (copter) {
        if (copter.enabled) this.setState({menuFor: null});
        this.props.QCA.setCopterEnabled(copter.id, !copter.enabled);
    }

    handleRestart (copter) {
        this.setState({menuFor: null});
        this.props.QCA.copter(copter.id).rebootCopter();
    }

    handleAssignNumber (copter, number) {
        if (!number || Number(number) === copter.number) return;
        this.setState(state => ({
            menuFor: null,
            renumbering: Object.assign({}, state.renumbering, {[copter.id]: true})
        }));
        this.props.QCA.assignCopterNumber(copter.id, Number(number)).finally(() => {
            this.setState(state => {
                const renumbering = Object.assign({}, state.renumbering);
                delete renumbering[copter.id];
                return {renumbering};
            });
        });
    }

    handleBatteryChange (copter, capacityMah) {
        this.props.QCA.setCopterBattery(copter.id, Number(capacityMah));
        this.forceUpdate();
    }

    /** Switching off cannot be undone by radio: the copter is switched on with its own button. */
    handleAskPowerOff (copter) {
        this.setState({menuFor: null, confirmReset: null, confirmPowerOff: copter.id});
    }

    handlePowerOff (copter) {
        this.setState({confirmPowerOff: null});
        this.setState({menuFor: null});
        this.props.QCA.copter(copter.id).powerOffCopter();
    }

    handleFactoryReset (copter) {
        this.setState({menuFor: null, confirmReset: null});
        this.props.QCA.resetCopterToFactory(copter.id);
    }

    handleUpdateFirmware (copter) {
        this.props.QCA.copter(copter.id).flashBundledFirmware({
            closeBlockedMessage: this.props.intl.formatMessage(messages.flashCloseBlocked)
        });
    }

    handleRecoverFirmware () {
        this.props.QCA.recoverInterruptedFirmware({
            closeBlockedMessage: this.props.intl.formatMessage(messages.flashCloseBlocked)
        });
    }

    /** New simulator copter sprite "Robbo Quadcopter N" next to the existing ones. */
    handleAddSimCopter () {
        const used = new Set(this.state.simCopters.map(c => c.number));
        let number = 1;
        while (used.has(number) && number < 15) number += 1;
        if (used.has(number)) return;
        const json = Object.assign({}, getDefaultSimulationCopterSpriteJson());
        const name = number === 1 ? 'Robbo Quadcopter' : `Robbo Quadcopter ${number}`;
        json.objName = name;
        json.scratchX = (((number - 1) % 5) * 80) - 160;
        json.scratchY = 0;
        this.props.VM.addSprite(json);
    }

    onThisWindowClose () {
        this.props.onQuadcopterPaletteWindowClose(0);
    }

    copterStatus (copter) {
        const {intl} = this.props;
        const sup = copter.supervisor;
        if (copter.searching || copter.rebooting) return intl.formatMessage(messages.statusSearching);
        if (!copter.connected) return intl.formatMessage(messages.statusLost);
        if (sup && sup.isLocked) return intl.formatMessage(messages.statusLocked);
        if (sup && (sup.isTumbled || sup.isCrashed)) return intl.formatMessage(messages.statusTumbled);
        return intl.formatMessage(copter.flying ? messages.statusFlying : messages.statusGround);
    }

    /**
     * Problems of one copter in plain words; only shown when something needs attention.
     * @returns {Array<{kind: string, text: string, action?: function}>} notices
     */
    copterAttention (copter) {
        const {intl, QCA} = this.props;
        const out = [];
        const sup = copter.supervisor;
        if (this.state.renumbering[copter.id] || copter.numbering) {
            out.push({kind: 'info', text: intl.formatMessage(messages.attentionRenumbering)});
            return out;
        }
        if (copter.autoNumbered) {
            out.push({kind: 'info', text: intl.formatMessage(messages.attentionAutoNumbered, {number: copter.number})});
        }
        if (copter.rebooting) {
            out.push({kind: 'info', text: intl.formatMessage(messages.attentionRestarting)});
            return out;
        }
        if (sup && sup.isLocked) {
            out.push({kind: 'danger', text: intl.formatMessage(messages.attentionLocked)});
        } else if (sup && (sup.isTumbled || sup.isCrashed)) {
            out.push({kind: 'danger', text: intl.formatMessage(messages.attentionTumbled)});
        }
        const battery = copter.battery;
        if (copter.connected && battery && !copter.flying && battery.canTakeOff === false) {
            out.push({kind: 'danger', text: intl.formatMessage(messages.attentionNoChargeToFly)});
        } else if (copter.connected && battery && (battery.level === 'warning' || battery.level === 'critical')) {
            out.push({kind: battery.level === 'critical' ? 'danger' : 'warning',
                text: intl.formatMessage(messages.attentionLowBattery)});
        }
        const errorCode = copter.lastError && copter.lastError.code;
        if (copter.connected && errorCode === 'landedAfterLinkLoss') {
            out.push({kind: 'warning', text: intl.formatMessage(messages.attentionLandedAfterLinkLoss)});
        } else if (copter.safetyLanding && errorCode === 'weakLinkLanding') {
            out.push({kind: 'warning', text: intl.formatMessage(messages.attentionWeakLinkLanding)});
        } else if (copter.safetyLanding && errorCode === 'quadcopterLowBatteryLanding') {
            out.push({kind: 'danger', text: intl.formatMessage(messages.attentionLowBatteryLanding)});
        } else if (copter.connected && copter.linkQuality !== null && copter.linkQuality < WEAK_LINK_PERCENT) {
            out.push({kind: 'warning', text: intl.formatMessage(messages.attentionWeakLink)});
        }
        if (!copter.connected && copter.lostInAirLanding) {
            out.push({kind: 'warning', text: intl.formatMessage(messages.attentionLostInAirLanding)});
        } else if (!copter.connected && copter.lostInAir) {
            out.push({kind: 'danger', text: intl.formatMessage(messages.attentionLostInAir)});
        } else if (!copter.connected && (copter.reconnecting || copter.searching) && copter.state !== 'disconnected') {
            out.push({kind: 'warning', text: intl.formatMessage(messages.attentionReconnecting)});
        } else if (!copter.connected && !copter.searching && copter.state === 'lost') {
            out.push({kind: 'warning', text: intl.formatMessage(messages.attentionLinkLost)});
        }
        const probe = QCA.getLastFirmwareProbe && QCA.getLastFirmwareProbe();
        if (probe && probe.needsUpdate && probe.uri === copter.uri && !QCA._firmwareFlashInProgress) {
            if (QCA.isAnyCopterAirborne()) {
                out.push({kind: 'info', text: intl.formatMessage(messages.attentionFirmwareFlightBlocked)});
            } else {
                out.push({
                    kind: 'info',
                    text: intl.formatMessage(messages.attentionNewFirmware),
                    actionLabel: intl.formatMessage(messages.update),
                    action: () => this.handleUpdateFirmware(copter)
                });
            }
        }
        return out;
    }

    /**
     * @param {?number} percent battery percent, null when unknown
     * @param {object} [battery] battery state of a real copter: level, minutes, vbat (smoothed)
     * @param {boolean} [detailed] add voltage, remaining minutes and capacity
     * @returns {React.Element} bar and percent (plus details)
     */
    renderBattery (percent, battery, detailed) {
        if (percent === null || percent === undefined) {
            return <span className={styles.battery}><span className={styles.muted}>{'—'}</span></span>;
        }
        const {intl} = this.props;
        const value = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
        const resolved = batteryColorLevel(value, battery && battery.level);
        const levelClass = {critical: styles.batteryLow, warning: styles.batteryWarning}[resolved] || styles.batteryOk;
        const minutes = (battery && Number.isFinite(battery.minutes) ?
            battery.minutes :
            value / 100 * FULL_BATTERY_FLIGHT_MINUTES).toFixed(1);
        const vbat = battery && Number.isFinite(battery.vbat) ? battery.vbat : null;
        return (
            <span className={styles.battery}>
                <span className={styles.batteryBar}>
                    <span
                        className={classNames(styles.batteryFill, levelClass)}
                        style={{width: `${value}%`}}
                    />
                </span>
                <span className={styles.batteryText}>{`${value}\u00a0%`}</span>
                {!detailed || vbat === null ? null : (
                    <span className={classNames(styles.muted, styles.batteryVolts)}>
                        {intl.formatMessage(messages.volts, {volts: vbat.toFixed(2)})}
                    </span>
                )}
                {detailed ? (
                    // The flight time comes from the battery capacity chosen in the copter menu.
                    <span
                        className={classNames(styles.muted, styles.batteryMinutes)}
                        title={battery && battery.capacityMah ?
                            intl.formatMessage(messages.batteryMah, {mah: battery.capacityMah}) : null}
                    >
                        {intl.formatMessage(messages.minutesLeft, {minutes})}
                    </span>
                ) : null}
            </span>
        );
    }

    /**
     * ready / warning (something to look at) / blocked (cannot fly) — from the same checks as the notices.
     * @param {object} copter copter list entry
     * @returns {string} readiness kind
     */
    copterReadiness (copter) {
        const sup = copter.supervisor;
        const battery = copter.battery || {};
        if (!copter.connected || (sup && (sup.isLocked || sup.isTumbled || sup.isCrashed)) ||
            battery.level === 'critical' || (sup && sup.canFly === false && !copter.flying)) {
            return 'blocked';
        }
        if (battery.level === 'warning' ||
            (copter.linkQuality !== null && copter.linkQuality < WEAK_LINK_PERCENT)) {
            return 'warning';
        }
        return 'ready';
    }

    /**
     * @param {object} copter copter list entry
     * @returns {string} colour of the status pill
     */
    copterStatusKind (copter) {
        const sup = copter.supervisor;
        if (copter.searching || copter.rebooting) return 'searching';
        if (!copter.connected) return 'problem';
        if (sup && (sup.isLocked || sup.isTumbled || sup.isCrashed)) return 'problem';
        return copter.flying ? 'flying' : 'ground';
    }

    renderStatus (kind, text) {
        return (
            <span className={classNames(styles.status, styles[`status_${kind}`])}>{text}</span>
        );
    }

    renderLinkBars (quality) {
        if (quality === null || quality === undefined) return <span className={styles.link} />;
        const bars = Math.max(0, Math.min(4, Math.round(quality / 25)));
        return (
            <span
                className={classNames(styles.link, {[styles.linkWeak]: quality < WEAK_LINK_PERCENT})}
                title={this.props.intl.formatMessage(messages.linkQuality, {quality})}
            >
                <span className={styles.linkBars}>
                    {[1, 2, 3, 4].map(i => (
                        <span
                            key={i}
                            className={classNames(styles.linkBar, {[styles.linkBarOn]: i <= bars})}
                            style={{height: `${i * 25}%`}}
                        />
                    ))}
                </span>
                <span className={styles.linkText}>{`${Math.round(quality)}\u00a0%`}</span>
            </span>
        );
    }

    renderCoords (x, y, z) {
        return (
            <span className={styles.coords}>
                {[['x', x], ['y', y], ['z', z]].map(([axis, value]) => (
                    <span
                        key={axis}
                        className={styles.coord}
                    >
                        <span className={styles.coordAxis}>{axis}</span>
                        {formatCoord(value)}
                    </span>
                ))}
            </span>
        );
    }

    /**
     * @param {?number} number copter number, null for a factory copter
     * @param {string} [readiness] adds the readiness dot: 'ready' | 'warning' | 'blocked'
     * @returns {React.Element} coloured number badge
     */
    renderNumberBadge (number, readiness) {
        const {intl} = this.props;
        const title = readiness ? intl.formatMessage({
            ready: messages.readyToFly, warning: messages.needsAttention, blocked: messages.cannotFly
        }[readiness]) : null;
        return (
            <span
                className={styles.numberBadge}
                style={{backgroundColor: copterColor(number)}}
                title={title}
            >
                {number || '?'}
                {readiness ? (
                    <span className={classNames(styles.readiness, styles[`readiness_${readiness}`])}>
                        {{ready: '✓', warning: '!', blocked: '✕'}[readiness]}
                    </span>
                ) : null}
            </span>
        );
    }

    renderAttention (notices) {
        return notices.map((notice, i) => (
            <div
                key={i}
                className={classNames(styles.attention, styles[`attention_${notice.kind}`])}
                role={notice.kind === 'danger' ? 'alert' : 'status'}
            >
                <span className={styles.attentionText}>{notice.text}</span>
                {notice.action ? (
                    <button
                        type="button"
                        className={styles.attentionAction}
                        onClick={notice.action}
                    >
                        {notice.actionLabel}
                    </button>
                ) : null}
            </div>
        ));
    }

    /**
     * Compact view: only the most important notice, so the list stays one line per copter.
     * @param {Array<object>} notices from {@link copterAttention}
     * @returns {?Array<React.Element>} notices to show
     */
    renderCardAttention (notices) {
        if (!this.state.compact) return this.renderAttention(notices);
        if (notices.length === 0) return null;
        const top = notices.slice().sort((a, b) => NOTICE_RANK[a.kind] - NOTICE_RANK[b.kind])[0];
        return this.renderAttention([top]);
    }

    renderMoreButton (menuFor) {
        const {intl} = this.props;
        return (
            <button
                type="button"
                data-copter-menu-toggle
                className={classNames(styles.iconButton, styles.moreButton,
                    {[styles.iconButtonActive]: this.state.menuFor === menuFor})}
                title={intl.formatMessage(messages.more)}
                aria-label={intl.formatMessage(messages.more)}
                aria-expanded={this.state.menuFor === menuFor}
                onClick={() => this.toggleMenu(menuFor)}
            />
        );
    }

    renderCopterMenu (copter) {
        const {intl, QCA} = this.props;
        const free = QCA.getFreeCopterNumbers();
        // Number and factory settings are written into the copter by radio: connected and on the ground.
        const canRewrite = copter.connected && !copter.flying;
        const rewriteHint = canRewrite ? null : intl.formatMessage(messages.needsConnection);
        const numbers = [copter.number].concat(free.filter(n => n !== copter.number));
        const batteryMah = QCA.getCopterBattery(copter.id);
        const confirming = this.state.confirmReset === copter.id;
        const compact = this.state.compact;
        const locked = Boolean(copter.supervisor && copter.supervisor.isLocked);
        const canPowerOff = copter.connected && !copter.flying;
        return (
            <div
                ref={this.setMenuRef}
                className={styles.menu}
            >
                <div className={styles.menuTitle}>{intl.formatMessage(messages.copterSettings)}</div>
                <label className={classNames(styles.menuRow, {[styles.menuRowDisabled]: copter.flying})}>
                    <span>{intl.formatMessage(messages.useOnThisComputer)}</span>
                    <input
                        type="checkbox"
                        checked
                        disabled={copter.flying}
                        onChange={() => this.handleToggleEnabled(copter)}
                    />
                </label>
                <div
                    className={classNames(styles.menuRow, {[styles.menuRowDisabled]: !canRewrite})}
                    title={rewriteHint}
                >
                    <span>{intl.formatMessage(messages.numberLabel)}</span>
                    {canRewrite && free.length > 0 ? (
                        <span className={styles.menuSelect}>
                            <RobboSelect
                                // Uncontrolled: remount when the number changes outside.
                                key={copter.number}
                                defaultValue={copter.number}
                                options={numbers.map(n => ({value: n, label: `№ ${n}`}))}
                                matchTriggerWidth
                                triggerAriaLabel={intl.formatMessage(messages.changeNumber)}
                                onChange={e => this.handleAssignNumber(copter, e.target.value)}
                            />
                        </span>
                    ) : (
                        <span className={styles.menuValue}>{`№ ${copter.number}`}</span>
                    )}
                </div>
                <div className={styles.menuRow}>
                    <span>{intl.formatMessage(messages.battery)}</span>
                    <span className={styles.menuSelect}>
                        <RobboSelect
                            key={batteryMah}
                            defaultValue={batteryMah}
                            options={QCA.getBatteryCapacities().map(mah => ({
                                value: mah,
                                label: intl.formatMessage(messages.batteryMah, {mah})
                            }))}
                            matchTriggerWidth
                            triggerAriaLabel={intl.formatMessage(messages.battery)}
                            onChange={e => this.handleBatteryChange(copter, e.target.value)}
                        />
                    </span>
                </div>
                <div className={styles.menuSeparator} />
                {/* Only actions without a button in the copter row (compact view hides them). */}
                {compact && !locked ? (
                    <button
                        type="button"
                        className={styles.menuItem}
                        onClick={() => this.handleRestart(copter)}
                    >
                        {intl.formatMessage(messages.restart)}
                    </button>
                ) : null}
                {compact ? (
                    <button
                        type="button"
                        className={styles.menuItem}
                        disabled={!canPowerOff}
                        title={canPowerOff ? null : rewriteHint}
                        onClick={() => this.handleAskPowerOff(copter)}
                    >
                        {intl.formatMessage(messages.powerOff)}
                    </button>
                ) : null}
                {confirming ? (
                    <div className={styles.menuConfirm}>
                        <span className={styles.menuConfirmText}>
                            {intl.formatMessage(messages.factoryResetConfirm)}
                        </span>
                        <button
                            type="button"
                            className={classNames(styles.confirmButton, styles.confirmDanger)}
                            onClick={() => this.handleFactoryReset(copter)}
                        >
                            {intl.formatMessage(messages.resetYes)}
                        </button>
                        <button
                            type="button"
                            className={styles.confirmButton}
                            onClick={() => this.setState({confirmReset: null})}
                        >
                            {intl.formatMessage(messages.cancel)}
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        className={classNames(styles.menuItem, styles.menuItemDanger)}
                        disabled={!canRewrite}
                        title={rewriteHint}
                        onClick={() => this.setState({confirmReset: copter.id})}
                    >
                        {intl.formatMessage(messages.factoryReset)}
                    </button>
                )}
                {compact ? null : <div className={styles.menuInfo}>{copter.uri}</div>}
            </div>
        );
    }

    renderPowerOffConfirm (copter) {
        const {intl} = this.props;
        const canPowerOff = copter.connected && !copter.flying;
        return (
            <div
                className={classNames(styles.attention, styles.attention_danger)}
                role="alert"
            >
                <span className={styles.attentionText}>
                    {intl.formatMessage(messages.powerOffConfirm, {number: copter.number})}
                </span>
                <button
                    type="button"
                    className={classNames(styles.confirmButton, styles.confirmDanger)}
                    disabled={!canPowerOff}
                    onClick={() => this.handlePowerOff(copter)}
                >
                    {intl.formatMessage(messages.powerOffYes)}
                </button>
                <button
                    type="button"
                    className={styles.confirmButton}
                    onClick={() => this.setState({confirmPowerOff: null})}
                >
                    {intl.formatMessage(messages.cancel)}
                </button>
            </div>
        );
    }

    renderCopterCard (copter) {
        const {intl} = this.props;
        const compact = this.state.compact;
        const name = intl.formatMessage(messages.copterNumber, {number: copter.number});
        if (!copter.enabled) {
            return (
                <div key={copter.id} className={classNames(styles.card, styles.cardDisabled)}>
                    <div className={styles.cardRow}>
                        {this.renderNumberBadge(copter.number)}
                        <label className={styles.cardMain}>
                            <input
                                type="checkbox"
                                className={styles.switch}
                                checked={false}
                                onChange={() => this.handleToggleEnabled(copter)}
                            />
                            <span className={styles.muted}>{intl.formatMessage(messages.notUsedHere)}</span>
                        </label>
                    </div>
                </div>
            );
        }
        const sup = copter.supervisor;
        const locked = Boolean(sup && sup.isLocked);
        const t = copter.telemetry || {};
        const battery = copter.connected ? copter.battery : null;
        return (
            <div key={copter.id} className={styles.card}>
                <div className={styles.cardRow}>
                    {this.renderNumberBadge(copter.number, this.copterReadiness(copter))}
                    <span className={styles.cardMain}>
                        {compact ? null : <span className={styles.copterName}>{name}</span>}
                        {this.renderStatus(this.copterStatusKind(copter), this.copterStatus(copter))}
                    </span>
                    {compact ? this.renderBattery(battery && battery.percent, battery) : null}
                    <span className={styles.cardActions}>
                        <button
                            type="button"
                            className={classNames(styles.iconButton, styles.identifyButton,
                                {[styles.identifyColored]: compact})}
                            style={compact ? {backgroundColor: copterColor(copter.number)} : null}
                            title={intl.formatMessage(messages.identify)}
                            aria-label={intl.formatMessage(messages.identify)}
                            disabled={!copter.connected}
                            onClick={() => this.props.QCA.copter(copter.id).identifyCopter()}
                        />
                        {compact && !locked ? null : (
                            <button
                                type="button"
                                className={classNames(styles.iconButton, styles.restartButton,
                                    {[styles.restartButtonBlinking]: locked})}
                                title={intl.formatMessage(messages.restart)}
                                aria-label={intl.formatMessage(messages.restart)}
                                onClick={() => this.handleRestart(copter)}
                            />
                        )}
                        {compact ? null : (
                            <button
                                type="button"
                                className={classNames(styles.iconButton, styles.powerButton)}
                                title={intl.formatMessage(messages.powerOff)}
                                aria-label={intl.formatMessage(messages.powerOff)}
                                disabled={!copter.connected || copter.flying}
                                onClick={() => this.handleAskPowerOff(copter)}
                            />
                        )}
                        {this.renderMoreButton(copter.id)}
                    </span>
                </div>
                {compact ? null : (
                    <div className={styles.cardMetrics}>
                        {this.renderBattery(battery && battery.percent, battery, true)}
                        {this.renderLinkBars(copter.connected ? copter.linkQuality : null)}
                        {this.renderCoords(t.x, t.y, t.z)}
                    </div>
                )}
                {this.state.menuFor === copter.id ? this.renderCopterMenu(copter) : null}
                {this.state.confirmPowerOff === copter.id ? this.renderPowerOffConfirm(copter) : null}
                {this.renderCardAttention(this.copterAttention(copter))}
            </div>
        );
    }

    renderNewCopter (copter) {
        const {intl, QCA} = this.props;
        const notices = this.copterAttention(copter).filter(n => n.kind !== 'warning');
        if (copter.connected && copter.numberedAs) {
            notices.unshift({
                kind: 'warning',
                text: intl.formatMessage(messages.attentionNumberedAsFactory, {number: copter.numberedAs}),
                actionLabel: intl.formatMessage(messages.restart),
                action: () => this.handleRestart(copter)
            });
        } else if (!copter.numbering) {
            if (copter.numberingFailed) {
                notices.unshift({
                    kind: 'warning',
                    text: intl.formatMessage(messages.attentionNumberFailed),
                    actionLabel: intl.formatMessage(messages.retry),
                    action: () => QCA.searchQuadcopterDevices()
                });
            } else if (copter.connected && QCA.getFreeCopterNumbers().length === 0) {
                notices.unshift({kind: 'warning', text: intl.formatMessage(messages.attentionNoFreeNumbers)});
            }
        }
        return (
            <div key="new" className={classNames(styles.card, styles.cardNew)}>
                <div className={styles.cardRow}>
                    {this.renderNumberBadge(null)}
                    <span className={styles.cardMain}>
                        <span className={styles.copterName}>{intl.formatMessage(messages.newCopter)}</span>
                        {!copter.connected && !copter.numbering ? (
                            <span className={styles.muted}>{intl.formatMessage(messages.newCopterWaiting)}</span>
                        ) : null}
                    </span>
                </div>
                {this.renderAttention(notices)}
            </div>
        );
    }

    renderSimCopter (copter) {
        const {intl} = this.props;
        const compact = this.state.compact;
        const low = copter.batteryPercent < 20;
        let readiness = 'ready';
        if (copter.batteryPercent <= 0) readiness = 'blocked';
        else if (low) readiness = 'warning';
        return (
            <div key={copter.id} className={styles.card}>
                <div className={styles.cardRow}>
                    {this.renderNumberBadge(copter.number, readiness)}
                    <span className={styles.cardMain}>
                        {compact ? null : (
                            <span className={styles.copterName}>
                                {intl.formatMessage(messages.copterNumber, {number: copter.number})}
                            </span>
                        )}
                        {this.renderStatus(copter.flying ? 'flying' : 'ground',
                            intl.formatMessage(copter.flying ? messages.statusFlying : messages.statusGround))}
                    </span>
                    {compact ? this.renderBattery(copter.batteryPercent) : (
                        <span className={styles.cardActions}>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                className={styles.chargeSlider}
                                title={intl.formatMessage(messages.battery)}
                                value={Math.round(copter.batteryPercent)}
                                onChange={e => this.handleSimCharge(copter, e.target.value)}
                            />
                        </span>
                    )}
                </div>
                {compact ? null : (
                    <div className={styles.cardMetrics}>
                        {this.renderBattery(copter.batteryPercent, null, true)}
                        {this.renderCoords(copter.x, copter.y, copter.z)}
                    </div>
                )}
                {low ? this.renderAttention([{
                    kind: copter.batteryPercent <= 0 ? 'danger' : 'warning',
                    text: intl.formatMessage(messages.attentionLowBattery)
                }]) : null}
            </div>
        );
    }

    handleSimCharge (copter, value) {
        const blocks = this.props.VM.runtime._copterBlocks;
        if (blocks) blocks.getController(copter.number).simChargeTo(value);
    }

    renderViewSwitch () {
        const {intl} = this.props;
        const compact = this.state.compact;
        return (
            <span className={styles.viewSwitch}>
                <button
                    type="button"
                    className={classNames(styles.viewButton, styles.viewCompact, {[styles.viewButtonOn]: compact})}
                    title={intl.formatMessage(messages.compactView)}
                    aria-label={intl.formatMessage(messages.compactView)}
                    aria-pressed={compact}
                    onClick={compact ? null : this.handleToggleCompact}
                />
                <button
                    type="button"
                    className={classNames(styles.viewButton, styles.viewDetailed, {[styles.viewButtonOn]: !compact})}
                    title={intl.formatMessage(messages.detailedView)}
                    aria-label={intl.formatMessage(messages.detailedView)}
                    aria-pressed={!compact}
                    onClick={compact ? this.handleToggleCompact : null}
                />
            </span>
        );
    }

    renderHeaderTools () {
        const {intl, QCA} = this.props;
        if (this.state.simulated) {
            return (
                <div className={styles.toolbar}>
                    <button
                        type="button"
                        className={styles.textButton}
                        onClick={this.handleAddSimCopter}
                    >
                        {`+ ${intl.formatMessage(messages.addCopter)}`}
                    </button>
                    <span className={styles.spacer} />
                    {this.renderViewSwitch()}
                </div>
            );
        }
        const group = QCA.getRadioGroup();
        const compact = this.state.compact;
        const inUse = this.state.copters.filter(c => c.connected && c.enabled && !c.isNew).length;
        const searching = this.state.copters.some(c => c.searching && !c.connected);
        return (
            <div className={styles.toolbar}>
                <button
                    type="button"
                    className={classNames(styles.textButton, styles.searchButton,
                        {[styles.searchButtonBusy]: searching})}
                    disabled={searching}
                    onClick={this.handleSearch}
                >
                    {intl.formatMessage(searching ? messages.searching : messages.search)}
                </button>
                {group === 1 ? null : (
                    <span className={styles.groupChip}>{intl.formatMessage(messages.group, {group})}</span>
                )}
                <span className={styles.spacer} />
                {this.renderViewSwitch()}
                {compact ? this.renderMoreButton(TOOLBAR_MENU) : null}
                {/* Nothing to land without copters (a copter that lost the link mid-air still counts). */}
                {inUse > 0 || QCA.isAnyCopterAirborne() ? (
                    <button
                        type="button"
                        // Compact view: the safety button gets its own full-width row.
                        className={classNames(styles.textButton, styles.landAllButton,
                            {[styles.landAllWide]: compact})}
                        onClick={this.handleLandAll}
                    >
                        {intl.formatMessage(inUse > 1 ? messages.landAll : messages.land)}
                    </button>
                ) : null}
                {compact ? null : this.renderMoreButton(TOOLBAR_MENU)}
            </div>
        );
    }

    /**
     * Group (radio channel) of this computer and the search on other channels: only needed with
     * several computers in one room, so they live in the toolbar menu.
     * @returns {React.Element} the toolbar menu
     */
    renderToolbarMenu () {
        const {intl, QCA} = this.props;
        const channels = QCA.getRadioGroupChannels();
        const airborne = QCA.isAnyCopterAirborne();
        const searching = Boolean(this.state.lost && this.state.lost.searching);
        const group = QCA.getRadioGroup();
        return (
            <div
                ref={this.setMenuRef}
                className={classNames(styles.menu, styles.toolbarMenu)}
            >
                <div className={styles.menuTitle}>{intl.formatMessage(messages.paletteSettings)}</div>
                <div className={classNames(styles.menuRow, {[styles.menuRowDisabled]: airborne})}>
                    <span>{intl.formatMessage(messages.groupSetting)}</span>
                    {airborne ? (
                        <span className={styles.menuValue}>{intl.formatMessage(messages.group, {group})}</span>
                    ) : (
                        <span className={styles.menuSelect}>
                            <RobboSelect
                                // Uncontrolled: remount when the group changes.
                                key={group}
                                defaultValue={group}
                                matchTriggerWidth
                                options={channels.map((channel, i) => ({
                                    value: i + 1,
                                    label: intl.formatMessage(messages.group, {group: i + 1})
                                }))}
                                triggerAriaLabel={intl.formatMessage(messages.groupSetting)}
                                onChange={this.handleGroupChange}
                            />
                        </span>
                    )}
                </div>
                <div className={styles.menuHint}>
                    {intl.formatMessage(airborne ? messages.groupLocked : messages.groupHint)}
                </div>
                <div className={styles.menuSeparator} />
                <button
                    type="button"
                    className={classNames(styles.textButton, styles.searchButton, styles.menuButton)}
                    disabled={searching || airborne}
                    title={airborne ? intl.formatMessage(messages.groupLocked) : null}
                    onClick={this.handleFindLost}
                >
                    {intl.formatMessage(messages.findLost)}
                </button>
                {this.renderLostCopters()}
            </div>
        );
    }

    /** Map items in stage metres: start point + local coordinates (Flow deck frames). */
    mapItems () {
        if (this.state.simulated) {
            return this.state.simCopters.map(c => ({
                id: c.id,
                number: c.number,
                x: c.originX + c.x,
                y: c.originY + c.y,
                z: c.z,
                // Scratch direction: 90 = +x, 0 = +y.
                headingRad: (90 - c.yaw) * Math.PI / 180,
                draggable: false
            }));
        }
        return this.state.copters.filter(c => c.connected && c.enabled && !c.isNew).map(c => {
            const start = this.startPoseOf(c);
            return {
                id: c.id,
                number: c.number,
                copter: c,
                x: start.x + c.telemetry.x,
                y: start.y + c.telemetry.y,
                z: c.telemetry.z,
                headingRad: c.telemetry.yawDeg * Math.PI / 180,
                draggable: !c.flying
            };
        });
    }

    handleMapPointerDown (event, item) {
        if (!item.draggable) return;
        event.preventDefault();
        this.mapDrag = {
            item,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startPose: this.startPoseOf(item.copter)
        };
        document.addEventListener('mousemove', this.handleMapPointerMove);
        document.addEventListener('mouseup', this.handleMapPointerUp);
    }

    handleMapPointerMove (event) {
        const drag = this.mapDrag;
        if (!drag || !this.mapScale) return;
        const pose = {
            x: drag.startPose.x + ((event.clientX - drag.startClientX) / this.mapScale.pxPerMeter),
            y: drag.startPose.y - ((event.clientY - drag.startClientY) / this.mapScale.pxPerMeter)
        };
        const startPoses = Object.assign({}, this.state.startPoses, {[this.startPoseKey(drag.item.copter)]: pose});
        this.setState({startPoses});
    }

    handleMapPointerUp () {
        if (this.mapDrag) {
            this.mapDrag = null;
            writeStartPoses(this.state.startPoses);
        }
        document.removeEventListener('mousemove', this.handleMapPointerMove);
        document.removeEventListener('mouseup', this.handleMapPointerUp);
    }

    renderMiniMap () {
        const items = this.mapItems();
        if (items.length < 2 || this.state.compact) return null;
        const xs = items.map(i => i.x);
        const ys = items.map(i => i.y);
        const margin = 0.5;
        const spanX = Math.max(2, Math.max(...xs) - Math.min(...xs) + (2 * margin));
        const spanY = Math.max(1, Math.max(...ys) - Math.min(...ys) + (2 * margin));
        const pxPerMeter = Math.min(MAP_WIDTH / spanX, MAP_HEIGHT / spanY);
        const centerX = (Math.max(...xs) + Math.min(...xs)) / 2;
        const centerY = (Math.max(...ys) + Math.min(...ys)) / 2;
        this.mapScale = {pxPerMeter};
        const toX = x => (MAP_WIDTH / 2) + ((x - centerX) * pxPerMeter);
        const toY = y => (MAP_HEIGHT / 2) - ((y - centerY) * pxPerMeter);
        const grid = [];
        const gridStep = MAP_GRID_M * pxPerMeter;
        for (let gx = toX(Math.floor((centerX - spanX) / MAP_GRID_M) * MAP_GRID_M); gx < MAP_WIDTH; gx += gridStep) {
            if (gx >= 0) grid.push(<line key={`x${gx}`} x1={gx} y1={0} x2={gx} y2={MAP_HEIGHT} />);
        }
        for (let gy = toY(Math.ceil((centerY + spanY) / MAP_GRID_M) * MAP_GRID_M); gy < MAP_HEIGHT; gy += gridStep) {
            if (gy >= 0) grid.push(<line key={`y${gy}`} x1={0} y1={gy} x2={MAP_WIDTH} y2={gy} />);
        }
        return (
            <svg
                className={styles.miniMap}
                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            >
                <g className={styles.miniMapGrid}>{grid}</g>
                {items.map(item => {
                    const cx = toX(item.x);
                    const cy = toY(item.y);
                    // Higher copters are drawn bigger, like the simulator sprite.
                    const r = Math.min(14, 7 + (Math.max(0, item.z) * 5));
                    const hx = cx + (Math.cos(item.headingRad) * (r + 6));
                    const hy = cy - (Math.sin(item.headingRad) * (r + 6));
                    return (
                        <g
                            key={item.id}
                            className={item.draggable ? styles.miniMapDraggable : null}
                            onMouseDown={e => this.handleMapPointerDown(e, item)}
                        >
                            <line
                                x1={cx}
                                y1={cy}
                                x2={hx}
                                y2={hy}
                                stroke={copterColor(item.number)}
                                strokeWidth="2"
                            />
                            <circle
                                cx={cx}
                                cy={cy}
                                r={r}
                                fill={copterColor(item.number)}
                            />
                            <text
                                x={cx}
                                y={cy + 4}
                                textAnchor="middle"
                                className={styles.miniMapLabel}
                            >
                                {item.number || '?'}
                            </text>
                        </g>
                    );
                })}
            </svg>
        );
    }

    /**
     * Before a swarm takes off: each copter knows only its own start point and nose (Flow deck),
     * so the formation holds only if they are placed alike (09.10.2026: two copters nearly collided
     * while their own estimates kept 0.8 m apart).
     * @returns {?React.Element} hint, or null in flight / with one copter
     */
    renderSwarmHint () {
        if (this.state.simulated || this.state.compact) return null;
        const swarm = this.state.copters.filter(c => c.connected && c.enabled && !c.isNew);
        if (swarm.length < 2 || swarm.some(c => c.flying)) return null;
        return <div className={styles.swarmHint}>{this.props.intl.formatMessage(messages.swarmHint)}</div>;
    }

    renderSummary () {
        const {intl} = this.props;
        let list;
        if (this.state.simulated) {
            list = this.state.simCopters.map(c => ({ready: c.batteryPercent > 0, flying: c.flying, battery: c.batteryPercent}));
        } else {
            list = this.state.copters.filter(c => c.connected && c.enabled && !c.isNew).map(c => {
                const sup = c.supervisor;
                const battery = c.battery || {};
                const ready = !(sup && (sup.isLocked || sup.isTumbled || sup.isCrashed)) && battery.level !== 'critical';
                return {ready, flying: c.flying, battery: battery.percent};
            });
        }
        if (list.length < 2) return null;
        const batteries = list.map(c => c.battery).filter(b => b !== null && b !== undefined);
        return (
            <div className={styles.summary}>
                {intl.formatMessage(messages.summary, {
                    ready: list.filter(c => c.ready).length,
                    total: list.length,
                    flying: list.filter(c => c.flying).length,
                    battery: batteries.length ? Math.round(Math.min(...batteries)) : '—'
                })}
            </div>
        );
    }

    renderLostCopters () {
        const {intl} = this.props;
        const lost = this.state.lost;
        if (!lost || this.state.simulated) return null;
        if (lost.searching) {
            return this.renderAttention([{kind: 'info', text: intl.formatMessage(messages.lostSearching)}]);
        }
        if (lost.list.length === 0) {
            return this.renderAttention([{kind: 'info', text: intl.formatMessage(messages.lostNone)}]);
        }
        return this.renderAttention(lost.list.map(item => ({
            kind: 'info',
            text: intl.formatMessage(messages.lostFound, {
                name: item.number ?
                    intl.formatMessage(messages.copterNumber, {number: item.number}) :
                    intl.formatMessage(messages.newCopter),
                channel: item.channel
            }),
            actionLabel: intl.formatMessage(messages.adopt),
            action: () => this.handleAdopt(item)
        })));
    }

    renderGlobalAttention () {
        const {intl, QCA} = this.props;
        const notices = [];
        if (!this.state.simulated && QCA.isFirmwareRecoveryNeeded && QCA.isFirmwareRecoveryNeeded() &&
            !QCA._firmwareFlashInProgress) {
            notices.push({
                kind: 'warning',
                text: intl.formatMessage(messages.attentionFlashInterrupted),
                actionLabel: intl.formatMessage(messages.update),
                action: this.handleRecoverFirmware
            });
        }
        return this.renderAttention(notices);
    }

    render () {
        const {intl} = this.props;
        const hardwareCopters = this.state.copters.filter(c => !c.isNew);
        const newCopter = this.state.copters.find(c => c.isNew);
        let list;
        if (this.state.simulated) {
            list = this.state.simCopters.map(c => this.renderSimCopter(c));
        } else {
            list = hardwareCopters.map(c => this.renderCopterCard(c));
            if (newCopter) list.push(this.renderNewCopter(newCopter));
            if (list.length === 0) {
                list = <div className={styles.empty}>{intl.formatMessage(messages.noCopters)}</div>;
            }
        }
        return (
            <div
                id="quadcopter-1"
                className={classNames(sharedStyles.palette, styles.quadcopter_palette,
                    this.state.compact ? styles.paletteCompact : styles.paletteDetailed)}
            >
                <div
                    id="quadcopter-tittle"
                    className={sharedStyles.header}
                >
                    <span className={sharedStyles.headerTitle}>
                        {intl.formatMessage(messages.copters)}
                    </span>
                    <button
                        type="button"
                        className={sharedStyles.closeButton}
                        aria-label={this.props.intl.formatMessage(closeMessage)}
                    title={this.props.intl.formatMessage(closeMessage)}
                        onClick={this.onThisWindowClose.bind(this)}
                    />
                </div>
                <div className={classNames(sharedStyles.body, styles.body)}>
                    <div className={styles.stickyTop}>
                        {this.renderHeaderTools()}
                        {!this.state.simulated && this.state.menuFor === TOOLBAR_MENU ? this.renderToolbarMenu() : null}
                    </div>
                    {this.state.compact ? null : this.renderSummary()}
                    {this.renderMiniMap()}
                    {this.renderSwarmHint()}
                    {this.renderGlobalAttention()}
                    <div className={styles.list}>{list}</div>
                </div>
            </div>
        );
    }
}

const mapStateToProps = () => ({});

const mapDispatchToProps = dispatch => ({
    onQuadcopterPaletteWindowClose: () => {
        dispatch(ActionTriggerDraggableWindow(0));
    }
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(QuadcopterPalleteComponent));
