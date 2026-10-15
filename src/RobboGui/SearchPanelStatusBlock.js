import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import formStyles from './RobboPaletteForm.css';
import styles from './SearchPanelStatusBlock.css';

const SearchPanelStatusBlock = ({
    variant,
    title,
    hint,
    steps,
    actionLabel,
    onAction
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
        {steps && steps.length ? (
            <ol className={styles.statusSteps}>
                {steps.map(step => <li key={step}>{step}</li>)}
            </ol>
        ) : null}
        {actionLabel && onAction ? (
            <button
                type="button"
                className={styles.statusAction}
                onClick={onAction}
            >
                {actionLabel}
            </button>
        ) : null}
    </div>
);

SearchPanelStatusBlock.propTypes = {
    variant: PropTypes.oneOf(['searching', 'empty', 'info']).isRequired,
    title: PropTypes.node.isRequired,
    hint: PropTypes.node,
    steps: PropTypes.arrayOf(PropTypes.node),
    actionLabel: PropTypes.node,
    onAction: PropTypes.func
};

export default SearchPanelStatusBlock;
