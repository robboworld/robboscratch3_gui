import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

import MenuComponent from '../components/menu/menu.jsx';
import RobboPopupTransition from '../RobboGui/RobboPopupTransition';
import '../RobboGui/robbo-popup-transition.css';

class Menu extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'addListeners',
            'removeListeners',
            'handleClick',
            'ref'
        ]);
    }
    componentDidMount () {
        if (this.props.open) this.addListeners();
    }
    componentDidUpdate (prevProps) {
        if (this.props.open && !prevProps.open) this.addListeners();
        if (!this.props.open && prevProps.open) this.removeListeners();
    }
    componentWillUnmount () {
        this.removeListeners();
    }
    addListeners () {
        document.addEventListener('mouseup', this.handleClick);
    }
    removeListeners () {
        document.removeEventListener('mouseup', this.handleClick);
    }
    handleClick (e) {
        if (this.props.open && !this.menu.contains(e.target)) {
            this.props.onRequestClose();
        }
    }
    ref (c) {
        this.menu = c;
    }
    render () {
        const {
            open,
            children,
            ...props
        } = this.props;
        return (
            <RobboPopupTransition in={open}>
                <MenuComponent
                    componentRef={this.ref}
                    {...props}
                >
                    {children}
                </MenuComponent>
            </RobboPopupTransition>
        );
    }
}

Menu.propTypes = {
    children: PropTypes.node,
    onRequestClose: PropTypes.func.isRequired,
    open: PropTypes.bool.isRequired
};

export default Menu;
