import React from 'react';
import {Component} from 'react';
import {connect} from 'react-redux';
import styles from './DraggableWindowComponent.css';

import {ItemTypes} from './drag_constants';
import {DragSource} from 'react-dnd';

import {ActionDropDraggableWindow} from './actions/sensor_actions';
import RobboPopupTransition from './RobboPopupTransition';
import {
    ROBBO_POPUP_Z_INDEX_BASE,
    raiseRobboPopupZIndex
} from '../lib/robbo-popup-z-index';
import {getViewportCenteredCoords} from '../lib/robbo-popup-position';
import {
    attachEmptyDragPreview,
    collectPopupDragSource,
    createPopupDragFollowState,
    handlePopupDragFollowLifecycle,
    resolvePopupDragTopLeft,
    stopPopupDragFollow,
    wrapPopupDragSource
} from '../lib/robbo-popup-drag-position';

const DraggableWindowSource = wrapPopupDragSource({
    beginDrag (props) {
        return {
            element_type: ItemTypes.DRAGGABLE_WINDOW,
            draggableWindowId: props.draggableWindowId
        };
    }
}, props => {
    const w = props.draggable_window[props.draggableWindowId];
    return {
        top: w ? w.position_top : 0,
        left: w ? w.position_left : 0
    };
});

function collect (connect, monitor) {
    return collectPopupDragSource(connect, monitor);
}

class DraggableWindowComponent extends Component {

    constructor (props) {
        super(props);
        this.state = {
            popupZIndex: ROBBO_POPUP_Z_INDEX_BASE,
            ...createPopupDragFollowState()
        };
        this.handlePopupMouseDown = this.handlePopupMouseDown.bind(this);
        this._handleTransitionEntered = this._handleTransitionEntered.bind(this);
    }

    componentDidUpdate (prevProps) {
        const windowId = this.props.draggableWindowId;
        const prevWindow = prevProps.draggable_window[windowId];
        const nextWindow = this.props.draggable_window[windowId];
        if (nextWindow && prevWindow && !prevWindow.isShowing && nextWindow.isShowing) {
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

    _handleTransitionEntered () {
        this.setState({popupZIndex: raiseRobboPopupZIndex()});
    }

    _resolveMountCoords () {
        if (typeof this.props.initialCoords !== 'undefined') {
            return {
                left: this.props.initialCoords[0],
                top: this.props.initialCoords[1]
            };
        }
        if (this.props.centerOnCreate && this.props.estimatedPopupSize) {
            return getViewportCenteredCoords(
                this.props.estimatedPopupSize.width,
                this.props.estimatedPopupSize.height
            );
        }
        return null;
    }

    componentDidMount () {
        attachEmptyDragPreview(this.props.connectDragPreview);
        const coords = this._resolveMountCoords();
        if (coords) {
            this.props.onCreateDraggableWindow(coords.top, coords.left, this.props.draggableWindowId);
        }
    }

    render () {
        const {connectDragSource, isDragging} = this.props;
        const draggable_window_id = this.props.draggableWindowId;

        let top = 200;
        let left = 200;
        let isShowing = false;

        if (typeof this.props.draggable_window[draggable_window_id] !== 'undefined') {
            top = this.props.draggable_window[draggable_window_id].position_top;
            left = this.props.draggable_window[draggable_window_id].position_left;
            isShowing = this.props.draggable_window[draggable_window_id].isShowing;
        }

        const position = resolvePopupDragTopLeft(
            top,
            left,
            isDragging,
            this.state.dragFollowTop,
            this.state.dragFollowLeft
        );

        return (
            <RobboPopupTransition
                in={isShowing}
                onEntered={this._handleTransitionEntered}
            >
                {connectDragSource(
                    <div
                        className={styles.draggable_window}
                        style={{
                            position: 'fixed',
                            top: `${position.top}px`,
                            left: `${position.left}px`,
                            zIndex: isShowing ? this.state.popupZIndex : undefined
                        }}
                        onMouseDown={isShowing ? this.handlePopupMouseDown : undefined}
                        aria-hidden={!isShowing}
                        id={`draggable_window_id-${this.props.draggableWindowId}`}
                    >
                        {this.props.children}
                    </div>
                )}
            </RobboPopupTransition>
        );
    }
}

const mapStateToProps = state => ({
    draggable_window: state.scratchGui.draggable_window
});

const mapDispatchToProps = dispatch => ({
    onCreateDraggableWindow: (top, left, draggable_window_id) => {
        dispatch(ActionDropDraggableWindow(top, left, draggable_window_id));
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(DragSource(ItemTypes.DRAGGABLE_WINDOW, DraggableWindowSource, collect)(DraggableWindowComponent));
