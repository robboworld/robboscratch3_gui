import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {CSSTransition} from 'react-transition-group';

import './robbo-popup-transition.css';

export const ROBBO_POPUP_TRANSITION_MS = 220;

class RobboPopupTransition extends Component {
    constructor (props) {
        super(props);
        this._handleEntered = this._handleEntered.bind(this);
    }

    _handleEntered (node, isAppearing) {
        if (this.props.onEntered) {
            this.props.onEntered(node, isAppearing);
        }
    }

    render () {
        const {children, in: inProp, timeout, unmountOnExit} = this.props;
        return (
            <CSSTransition
                in={inProp}
                timeout={timeout != null ? timeout : ROBBO_POPUP_TRANSITION_MS}
                classNames="robboPopup"
                unmountOnExit={unmountOnExit !== false}
                onEntered={this._handleEntered}
            >
                {children}
            </CSSTransition>
        );
    }
}

RobboPopupTransition.propTypes = {
    children: PropTypes.node,
    in: PropTypes.bool.isRequired,
    onEntered: PropTypes.func,
    timeout: PropTypes.number,
    unmountOnExit: PropTypes.bool
};

export default RobboPopupTransition;
