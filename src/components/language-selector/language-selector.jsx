import PropTypes from 'prop-types';
import React from 'react';

import locales from 'scratch-l10n';
import MenuBarMenu from '../menu-bar/menu-bar-menu.jsx';
import {MenuItem} from '../menu/menu.jsx';

import styles from './language-selector.css';

// supported languages to exclude from the menu, but allow as a URL option
const ignore = [];

const localeEntries = Object.keys(locales)
    .filter(l => !ignore.includes(l))
    .map(locale => ({
        locale,
        name: locales[locale].name
    }));

const LanguageMenu = ({
    className,
    currentLocale,
    menuClassName,
    onRequestClose,
    onSelectLocale,
    open,
    place
}) => (
    <MenuBarMenu
        className={className}
        menuClassName={menuClassName}
        open={open}
        place={place}
        onRequestClose={onRequestClose}
    >
        {localeEntries.map(({locale, name}) => {
            const isActive = locale === currentLocale;
            return (
                <MenuItem
                    key={locale}
                    className={styles.languageMenuItem}
                    onClick={() => onSelectLocale(locale)}
                >
                    <span
                        aria-hidden="true"
                        className={styles.languageMenuItemCheck}
                    >
                        {isActive ? '✓' : ''}
                    </span>
                    <span className={styles.languageMenuItemLabel}>
                        {name}
                    </span>
                </MenuItem>
            );
        })}
    </MenuBarMenu>
);

LanguageMenu.propTypes = {
    className: PropTypes.string,
    currentLocale: PropTypes.string,
    menuClassName: PropTypes.string,
    onRequestClose: PropTypes.func.isRequired,
    onSelectLocale: PropTypes.func.isRequired,
    open: PropTypes.bool,
    place: PropTypes.oneOf(['left', 'right'])
};

export default LanguageMenu;
