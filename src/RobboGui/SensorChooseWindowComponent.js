import classNames from 'classnames';
import React  from 'react';
import { Component } from 'react';
import { connect } from 'react-redux';
import  SensorChooseWindowComponentElement from './SensorChooseWindowComponentElement'
import  styles from './SensorChooseWindowComponent.css';
import sharedStyles from './DevicePaletteShared.css';

import PropTypes from 'prop-types';
import {defineMessages, injectIntl} from 'react-intl';
import {closeMessage, sensorTypeMessages} from './sensor-type-messages';
import {registerEscapeClosable} from '../lib/robbo-popup-escape';
import { ItemTypes } from './drag_constants';
import { DragSource } from 'react-dnd';
import {
    ROBBO_POPUP_Z_INDEX_BASE,
    raiseRobboPopupZIndex
} from '../lib/robbo-popup-z-index';
import RobboPopupTransition from './RobboPopupTransition';
import {
    attachEmptyDragPreview,
    collectPopupDragSource,
    createPopupDragFollowState,
    handlePopupDragFollowLifecycle,
    resolvePopupDragTopLeft,
    stopPopupDragFollow,
    wrapPopupDragSource
} from '../lib/robbo-popup-drag-position';

const messages = defineMessages({
    title: {id: 'gui.RobboGui.SensorChoose.title', description: 'Sensor type window title', defaultMessage: 'Sensor type'}
});

const ROBOT_SENSORS = ['nosensor', 'line', 'led', 'light', 'touch', 'proximity', 'ultrasonic', 'color'];
const LAB_SENSORS = ['nosensor', 'clamps', 'temperature'];

/**
 * @param {string} deviceName 'robot' | 'lab'
 * @param {string} callerType 'ANALOG' | 'DIGITAL'
 * @returns {Array<string>} sensors that fit the port
 */
const sensorChoices = (deviceName, callerType) => {
    if (deviceName === 'robot') return ROBOT_SENSORS;
    // A digital lab port cannot read the temperature sensor.
    return callerType === 'DIGITAL' ? LAB_SENSORS.filter(name => name !== 'temperature') : LAB_SENSORS;
};

const SensorChooseWindowSource = wrapPopupDragSource({
    beginDrag () {
        return {
            element_type: ItemTypes.SENSOR_CHOOSE_WINDOW
        };
    }
}, props => ({
    top: props.top,
    left: props.left
}));

function collect (connect, monitor) {
    return collectPopupDragSource(connect, monitor);
}




class SensorChooseWindowComponent extends Component {

  constructor (props) {
    super(props);
    this.state = {
      popupZIndex: ROBBO_POPUP_Z_INDEX_BASE,
      ...createPopupDragFollowState()
    };
    this.handlePopupMouseDown = this.handlePopupMouseDown.bind(this);
    this._handleTransitionEntered = this._handleTransitionEntered.bind(this);
  }

  _handleTransitionEntered () {
    this.setState({popupZIndex: raiseRobboPopupZIndex()});
  }

  componentDidMount () {
    attachEmptyDragPreview(this.props.connectDragPreview);
    this.unregisterEscape = registerEscapeClosable({
      isOpen: () => this.props.isShowing,
      getZIndex: () => this.state.popupZIndex,
      close: () => this.props.onClose()
    });
  }

  componentDidUpdate (prevProps) {
    // Clicking another port raises its palette first: the window must come back on top.
    const switched = prevProps.CallerSensorId !== this.props.CallerSensorId ||
      prevProps.SensorCallerDeviceName !== this.props.SensorCallerDeviceName ||
      prevProps.top !== this.props.top || prevProps.left !== this.props.left;
    if (this.props.isShowing && (!prevProps.isShowing || switched)) {
      this.setState({popupZIndex: raiseRobboPopupZIndex()});
    }
    handlePopupDragFollowLifecycle(this, prevProps, this.props.isDragging);
  }

  componentWillUnmount () {
    stopPopupDragFollow(this);
    if (this.unregisterEscape) this.unregisterEscape();
  }

  handlePopupMouseDown () {
    this.setState({popupZIndex: raiseRobboPopupZIndex()});
  }

  render() {

    const { connectDragSource, isDragging, isShowing, top, left, CallerSensorId, SensorCallerDeviceName, CallerSensorType } = this.props;
    const position = resolvePopupDragTopLeft(
      top,
      left,
      isDragging,
      this.state.dragFollowTop,
      this.state.dragFollowLeft
    );

             const sensorNames = sensorChoices(SensorCallerDeviceName, CallerSensorType);
             const intl = this.props.intl;

             return (
                <RobboPopupTransition
                    in={isShowing}
                    onEntered={this._handleTransitionEntered}
                >
                {connectDragSource(
                <div
                        className={classNames(sharedStyles.palette, styles.sensor_choose_window)}
                        style={{
                              position: 'fixed',
                              top: `${position.top}px`,
                              left: `${position.left}px`,
                              zIndex: isShowing ? this.state.popupZIndex : undefined
                              }}
                        role="dialog"
                        aria-label={intl.formatMessage(messages.title)}
                        aria-hidden={!isShowing}
                        onMouseDown={isShowing ? this.handlePopupMouseDown : undefined}
                >

                  <div className={sharedStyles.header}>
                      <span className={sharedStyles.headerTitle}>
                          {intl.formatMessage(messages.title)}
                      </span>
                      <button
                          type="button"
                          className={sharedStyles.closeButton}
                          aria-label={intl.formatMessage(closeMessage)}
                          onClick={this.props.onClose}
                      />
                  </div>

                  <div className={classNames(sharedStyles.body, styles.sensor_choose_window_components_block)}>
                    {sensorNames.map(sensorName => (
                      <SensorChooseWindowComponentElement
                        key={`${SensorCallerDeviceName}-${sensorName}`}
                        deviceName={SensorCallerDeviceName}
                        sensorName={sensorName}
                        label={intl.formatMessage(sensorTypeMessages[sensorName])}
                        selected={sensorName === this.props.currentSensorName}
                        sensorPictureUrl={`./static/robbo_assets/32/${SensorCallerDeviceName}_sensor_${sensorName}.png`}
                        CallerSensorId={CallerSensorId}
                      />
                    ))}
                  </div>

                </div>
                )}
                </RobboPopupTransition>
            );
    }
  }


  SensorChooseWindowComponent.propTypes = {
    connectDragSource: PropTypes.func.isRequired,
    isDragging: PropTypes.bool.isRequired,
    isShowing: PropTypes.bool.isRequired,
    top: PropTypes.number.isRequired,
    left: PropTypes.number.isRequired,
    CallerSensorId: PropTypes.number.isRequired,
    SensorCallerDeviceName: PropTypes.string.isRequired,
    CallerSensorType: PropTypes.string.isRequired,
    currentSensorName: PropTypes.string,
    onClose: PropTypes.func.isRequired

  };


/** Sensor now set on the calling port: highlighted in the window. */
const findCurrentSensorName = (state, ownProps) => {
    const list = ownProps.SensorCallerDeviceName === 'robot' ?
        state.scratchGui.robot_sensors :
        state.scratchGui.lab_external_sensors;
    const sensor = (list || []).find(item => item.sensor_id === ownProps.CallerSensorId);
    return sensor ? sensor.sensor_name : null;
};

const mapStateToProps = (state, ownProps) => ({
    currentSensorName: findCurrentSensorName(state, ownProps)
});

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch({type: 'HIDE_SENSOR_CHOOSE_WINDOW'})
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(DragSource(ItemTypes.SENSOR_CHOOSE_WINDOW, SensorChooseWindowSource, collect)(SensorChooseWindowComponent)));
