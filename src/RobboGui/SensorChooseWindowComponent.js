import classNames from 'classnames';
import React  from 'react';
import { Component } from 'react';
import { connect } from 'react-redux';
import  SensorChooseWindowComponentElement from './SensorChooseWindowComponentElement'
import  styles from './SensorChooseWindowComponent.css';

import PropTypes from 'prop-types';
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
  }

  componentDidUpdate (prevProps) {
    if (!prevProps.isShowing && this.props.isShowing) {
      this.setState({popupZIndex: raiseRobboPopupZIndex()});
    }
    handlePopupDragFollowLifecycle(this, prevProps, this.props.isDragging);
  }

  componentWillUnmount () {
    stopPopupDragFollow(this);
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

    //let showing_state = isShowing? styles.sensor_choose_window.window_show: styles.sensor_choose_window.window_hide;
  //  let final_state = isDragging? styles.sensor_choose_window.window_show.window_drag:showing_state;
    var i = 0;



             return (
                <RobboPopupTransition
                    in={isShowing}
                    onEntered={this._handleTransitionEntered}
                >
                {connectDragSource(
                <div
                        className={styles.sensor_choose_window}
                        style={{
                              position: 'fixed',
                              top: `${position.top}px`,
                              left: `${position.left}px`,
                              zIndex: isShowing ? this.state.popupZIndex : undefined
                              }}
                        aria-hidden={!isShowing}
                        onMouseDown={isShowing ? this.handlePopupMouseDown : undefined}
                >


                  <div className={styles.sensor_choose_window_tittle}>

                      Sensor type

                  </div>

                  <div className={styles.sensor_choose_window_components_block}>

                    {


                      (() => {

                        let elements = [];
                        let sensor_names = (SensorCallerDeviceName == "robot")? ["nosensor","line","led","light","touch","proximity","ultrasonic","color"]:["nosensor","clamps","temperature"];

                      //  console.log("SensorCallerDeviceName: " + SensorCallerDeviceName + " CallerSensorType: " + CallerSensorType)

                        if ((SensorCallerDeviceName !== "robot") && (CallerSensorType == "DIGITAL")) {

                              sensor_names = sensor_names.filter(

                                  (element,index) => {

                                    //  console.log("element: " + element);
                                        return  (element !== "temperature")
                                  }

                              );

                        }

                           sensor_names.map((sensor_name, index) =>

                                {

                                  elements.push(<SensorChooseWindowComponentElement deviceName={`${SensorCallerDeviceName}`} sensorName={`${sensor_name}`} key={`SensorChooseWindowComponentElement-${index}`} sensorPictureUrl={`./static/robbo_assets/32/${SensorCallerDeviceName}_sensor_${sensor_name}.png`}
                                    CallerSensorId={CallerSensorId}/>);


                                });










                        return elements;

                      })()




                    }




                  </div>



                </div>
                )}
                </RobboPopupTransition>
            );







    };




  }


  SensorChooseWindowComponent.propTypes = {
    connectDragSource: PropTypes.func.isRequired,
    isDragging: PropTypes.bool.isRequired,
    isShowing: PropTypes.bool.isRequired,
    top: PropTypes.number.isRequired,
    left: PropTypes.number.isRequired,
    CallerSensorId: PropTypes.number.isRequired,
    SensorCallerDeviceName: PropTypes.string.isRequired,
    CallerSensorType: PropTypes.string.isRequired

  };


export default DragSource(ItemTypes.SENSOR_CHOOSE_WINDOW, SensorChooseWindowSource, collect)(SensorChooseWindowComponent);
