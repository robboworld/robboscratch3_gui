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
        paletteFlyoutWidth,
        paletteResizing,
        paletteResizeDisabled,
        paletteToggleTitle,
        onTogglePalette,
        onPaletteResizePointerDown,
        ...componentProps
    } = props;
    return (
        <Box
            className={classNames(styles.blocks, {
                [styles.dragOver]: dragOver,
                [styles.paletteCollapsed]: paletteCollapsed,
                [styles.paletteAnimating]: paletteAnimating,
                [styles.paletteResizing]: paletteResizing
            })}
            {...componentProps}
            componentRef={containerRef}
        >
            {onTogglePalette && onPaletteResizePointerDown ? (
                <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-hidden={paletteResizeDisabled}
                    className={classNames(styles.paletteResizeHandle, {
                        [styles.paletteResizeHandleDisabled]: paletteResizeDisabled
                    })}
                    onPointerDown={paletteResizeDisabled ? null : onPaletteResizePointerDown}
                />
            ) : null}
            {onTogglePalette ? (
                <button
                    type="button"
                    className={classNames(styles.paletteToggle, {
                        [styles.paletteToggleCollapsed]: paletteCollapsed
                    })}
                    aria-expanded={!paletteCollapsed}
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
    paletteFlyoutWidth: PropTypes.number,
    paletteResizing: PropTypes.bool,
    paletteResizeDisabled: PropTypes.bool,
    paletteToggleTitle: PropTypes.string,
    onTogglePalette: PropTypes.func,
    onPaletteResizePointerDown: PropTypes.func
};
export default BlocksComponent;
