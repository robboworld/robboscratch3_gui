import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {selectLocale} from '../reducers/locales';
import {closeLanguageMenu} from '../reducers/menus';

import LanguageMenu from '../components/language-selector/language-selector.jsx';

class LanguageSelector extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleSelectLocale'
        ]);
        document.documentElement.lang = props.currentLocale;
    }
    handleSelectLocale (locale) {
        if (this.props.messagesByLocale[locale]) {
            this.props.onChangeLanguage(locale);
            document.documentElement.lang = locale;
        }
    }
    render () {
        return (
            <LanguageMenu
                className={this.props.menuWrapperClassName}
                currentLocale={this.props.currentLocale}
                menuClassName={this.props.menuListClassName}
                open={this.props.open}
                place={this.props.isRtl ? 'left' : 'right'}
                onRequestClose={this.props.onRequestClose}
                onSelectLocale={this.handleSelectLocale}
            />
        );
    }
}

LanguageSelector.propTypes = {
    currentLocale: PropTypes.string.isRequired,
    isRtl: PropTypes.bool,
    menuListClassName: PropTypes.string,
    menuWrapperClassName: PropTypes.string,
    messagesByLocale: PropTypes.object, // eslint-disable-line react/forbid-prop-types
    onChangeLanguage: PropTypes.func.isRequired,
    onRequestClose: PropTypes.func.isRequired,
    open: PropTypes.bool
};

const mapStateToProps = state => ({
    currentLocale: state.locales.locale,
    isRtl: state.locales.isRtl,
    messagesByLocale: state.locales.messagesByLocale
});

const mapDispatchToProps = dispatch => ({
    onChangeLanguage: locale => {
        dispatch(selectLocale(locale));
        dispatch(closeLanguageMenu());
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(LanguageSelector);
