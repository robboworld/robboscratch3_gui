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
    cause
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
        {cause ? (
            <div
                className={styles.statusCause}
                role="alert"
            >
                <div className={styles.statusCauseTitle}>{cause.title}</div>
                {cause.action ? <div className={styles.statusCauseAction}>{cause.action}</div> : null}
            </div>
        ) : null}
        {steps && steps.length ? (
            <ol className={styles.statusSteps}>
                {steps.map(step => <li key={step}>{step}</li>)}
            </ol>
        ) : null}
    </div>
);

SearchPanelStatusBlock.propTypes = {
    variant: PropTypes.oneOf(['searching', 'empty', 'info']).isRequired,
    title: PropTypes.node.isRequired,
    hint: PropTypes.node,
    steps: PropTypes.arrayOf(PropTypes.node),
    // a known reason (support-report diagnose): what is wrong and what to do
    cause: PropTypes.shape({
        title: PropTypes.node.isRequired,
        action: PropTypes.node
    })
};

export default SearchPanelStatusBlock;
