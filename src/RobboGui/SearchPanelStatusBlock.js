import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import formStyles from './RobboPaletteForm.css';
import styles from './SearchPanelStatusBlock.css';

const SearchPanelStatusBlock = ({
    variant,
    title,
    hint
}) => (
    <div
        className={classNames(
            formStyles.section,
            styles.statusBlock,
            variant === 'searching' && styles.statusBlockSearching,
            variant === 'empty' && styles.statusBlockEmpty
        )}
        role="status"
    >
        {variant === 'searching' ? (
            <span className={styles.statusSpinner} aria-hidden="true" />
        ) : null}
        <div className={styles.statusTitle}>{title}</div>
        {hint ? (
            <div className={styles.statusHint}>{hint}</div>
        ) : null}
    </div>
);

SearchPanelStatusBlock.propTypes = {
    variant: PropTypes.oneOf(['searching', 'empty', 'info']).isRequired,
    title: PropTypes.node.isRequired,
    hint: PropTypes.node
};

export default SearchPanelStatusBlock;
