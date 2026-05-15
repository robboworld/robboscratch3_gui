import PropTypes from 'prop-types';
import classNames from 'classnames';
import React from 'react';
import Box from '../box/box.jsx';
import styles from './blocks.css';

const BlocksComponent = props => {
    const {
        containerRef,
        dragOver,
        paletteCollapsed,
        paletteAnimating,
        paletteToggleTitle,
        onTogglePalette,
        ...componentProps
    } = props;
    return (
        <Box
            className={classNames(styles.blocks, {
                [styles.dragOver]: dragOver,
                [styles.paletteCollapsed]: paletteCollapsed
            })}
            {...componentProps}
            componentRef={containerRef}
        >
            {onTogglePalette ? (
                <button
                    type="button"
                    className={classNames(styles.paletteToggle, {
                        [styles.paletteToggleCollapsed]: paletteCollapsed
                    })}
                    aria-expanded={!paletteCollapsed}
                    disabled={paletteAnimating}
                    title={paletteToggleTitle}
                    onClick={onTogglePalette}
                >
                    <span
                        className={styles.paletteToggleIcon}
                        aria-hidden="true"
                    />
                </button>
            ) : null}
        </Box>
    );
};
BlocksComponent.propTypes = {
    containerRef: PropTypes.func,
    dragOver: PropTypes.bool,
    paletteCollapsed: PropTypes.bool,
    paletteAnimating: PropTypes.bool,
    paletteToggleTitle: PropTypes.string,
    onTogglePalette: PropTypes.func
};
export default BlocksComponent;
