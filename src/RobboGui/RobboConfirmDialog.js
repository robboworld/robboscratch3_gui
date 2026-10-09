import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import ReactDOM from 'react-dom';

import styles from './RobboConfirmDialog.css';

/** Modal question in the Robbo window style with verbs on the buttons. */
class RobboConfirmDialog extends Component {
    constructor (props) {
        super(props);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.setConfirmRef = element => {
            this.confirmButton = element;
        };
    }

    componentDidMount () {
        document.addEventListener('keydown', this.handleKeyDown, true);
        if (this.confirmButton) this.confirmButton.focus();
    }

    componentWillUnmount () {
        document.removeEventListener('keydown', this.handleKeyDown, true);
    }

    handleKeyDown (event) {
        if (event.key === 'Escape') {
            event.stopPropagation();
            this.props.onAnswer(false);
        }
    }

    render () {
        const {title, message, confirmLabel, cancelLabel, danger, onAnswer} = this.props;
        return (
            <div className={styles.overlay}>
                <div
                    className={styles.dialog}
                    role="alertdialog"
                    aria-modal="true"
                    aria-label={title || message}
                >
                    {title ? (
                        <div className={styles.header}>
                            <span className={styles.title}>{title}</span>
                        </div>
                    ) : null}
                    <div className={styles.body}>{message}</div>
                    <div className={styles.actions}>
                        {cancelLabel ? (
                            <button
                                type="button"
                                className={styles.button}
                                onClick={() => onAnswer(false)}
                            >
                                {cancelLabel}
                            </button>
                        ) : null}
                        <button
                            type="button"
                            ref={this.setConfirmRef}
                            className={classNames(styles.button, danger ? styles.danger : styles.primary)}
                            onClick={() => onAnswer(true)}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

RobboConfirmDialog.propTypes = {
    cancelLabel: PropTypes.string,
    confirmLabel: PropTypes.string.isRequired,
    danger: PropTypes.bool,
    message: PropTypes.string.isRequired,
    onAnswer: PropTypes.func.isRequired,
    title: PropTypes.string
};

/**
 * Ask a question in an in-app dialog (replaces window.confirm(), which NW.js shows as an
 * unstyled system window with OK / Cancel).
 * @param {object} options dialog texts
 * @param {string} options.message question; "\n" starts a new line
 * @param {string} options.confirmLabel verb of the action, e.g. "Update firmware"
 * @param {string} [options.cancelLabel] e.g. "Not now"; no cancel button when omitted
 * @param {string} [options.title] header
 * @param {boolean} [options.danger] red confirm button
 * @returns {Promise<boolean>} true when confirmed
 */
const robboConfirm = options => new Promise(resolve => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const answer = value => {
        ReactDOM.unmountComponentAtNode(host);
        host.remove();
        resolve(value);
    };
    ReactDOM.render(
        <RobboConfirmDialog
            {...options}
            onAnswer={answer}
        />,
        host
    );
});

export {robboConfirm};
export default RobboConfirmDialog;
