import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import styles from './toggle-buttons.css';

const ToggleButtons = ({buttons, className, disabled}) => (
    <div
        className={classNames(styles.row, className, {
            [styles.disabled]: disabled
        })}
    >
        {buttons.map((button, index) => (
            <button
                key={index}
                aria-label={button.title}
                aria-pressed={button.isSelected}
                className={styles.button}
                disabled={disabled}
                title={button.title}
                onClick={button.handleClick}
            >
                <img
                    className={button.iconClassName}
                    draggable={false}
                    src={button.icon}
                />
            </button>
        ))}
    </div>
);

ToggleButtons.propTypes = {
    buttons: PropTypes.arrayOf(PropTypes.shape({
        title: PropTypes.string.isRequired,
        handleClick: PropTypes.func.isRequired,
        icon: PropTypes.string.isRequired,
        iconClassName: PropTypes.string,
        isSelected: PropTypes.bool
    })),
    className: PropTypes.string,
    disabled: PropTypes.bool
};

ToggleButtons.defaultProps = {
    disabled: false
};

export default ToggleButtons;
