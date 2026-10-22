import PropTypes from 'prop-types';
import React from 'react';
import Box from '../box/box.jsx';
import {FormattedMessage} from 'react-intl';

import styles from './crash-message.css';
import reloadIcon from './reload.svg';

const CrashMessage = props => (
    <div className={styles.crashWrapper}>
        <Box className={styles.body}>
            <img
                className={styles.reloadIcon}
                src={reloadIcon}
            />
            <h2>
                <FormattedMessage
                    defaultMessage="Oops! Something went wrong."
                    description="Crash Message title"
                    id="gui.crashMessage.label"
                />
            </h2>
            <p>
                <FormattedMessage
                    defaultMessage={'We are so sorry, but it looks like Scratch has crashed. This bug has been' +
                        ' automatically reported to the Scratch Team. Please refresh your page to try' +
                        ' again.'}
                    description="Message to inform the user that page has crashed."
                    id="gui.crashMessage.description"
                />
            </p>
            {props.eventId && (
                <p>
                    <FormattedMessage
                        defaultMessage="Your error was logged with id {errorId}"
                        description="Message to inform the user that page has crashed."
                        id="gui.crashMessage.errorNumber"
                        values={{
                            errorId: props.eventId
                        }}
                    />
                </p>
            )}
            {props.errorMessage && (
                <p className={styles.errorMessage}>{props.errorMessage}</p>
            )}
            <div className={styles.actions}>
                <button
                    className={styles.reloadButton}
                    onClick={props.onReload}
                >
                    <FormattedMessage
                        defaultMessage="Reload"
                        description="Button to reload the page when page crashes"
                        id="gui.crashMessage.reload"
                    />
                </button>
                {props.onSaveReport && props.reportSave && props.reportSave.status === 'saved' &&
                    props.reportSave.path ? (
                        // saved: the same button now shows the file
                        <button
                            className={styles.reportButton}
                            title={props.reportSave.path}
                            onClick={props.onShowReport}
                        >
                            {'✓ '}
                            <FormattedMessage
                                defaultMessage="Show in folder"
                                description="About window: open the folder with the saved support report"
                                id="gui.RobboGui.show_in_folder"
                            />
                        </button>
                    ) : props.onSaveReport && (
                        <button
                            className={styles.reportButton}
                            disabled={props.reportSave && props.reportSave.status === 'saving'}
                            onClick={props.onSaveReport}
                        >
                            <FormattedMessage
                                defaultMessage="Save report for support"
                                description="Crash screen: save the support report to a file"
                                id="gui.RobboGui.save_support_report"
                            />
                        </button>
                    )}
            </div>
            {props.reportSave && props.reportSave.status === 'saved' && (
                <p className={styles.reportStatus}>
                    {props.reportSave.downloaded ? (
                        <FormattedMessage
                            defaultMessage="Report downloaded. Send the file to support."
                            description="About window: the support report was downloaded (web)"
                            id="gui.RobboGui.support_report_downloaded"
                        />
                    ) : props.reportSave.onDesktop ? (
                        <FormattedMessage
                            defaultMessage="Saved to the Desktop: {file}"
                            description="About window: the support report was saved to the Desktop (file name)"
                            id="gui.RobboGui.support_report_saved_desktop"
                            values={{file: props.reportSave.fileName}}
                        />
                    ) : (
                        <FormattedMessage
                            defaultMessage="Report saved: {path}"
                            description="About window: where the support report was saved"
                            id="gui.RobboGui.support_report_saved"
                            values={{path: props.reportSave.path}}
                        />
                    )}
                </p>
            )}
            {props.reportSave && props.reportSave.status === 'error' && (
                <p className={styles.reportStatus}>
                    <FormattedMessage
                        defaultMessage="Could not save the report: {message}"
                        description="About window: the support report could not be saved"
                        id="gui.RobboGui.support_report_error"
                        values={{message: props.reportSave.message}}
                    />
                </p>
            )}
        </Box>
    </div>
);

CrashMessage.propTypes = {
    errorMessage: PropTypes.string,
    eventId: PropTypes.string,
    onReload: PropTypes.func.isRequired,
    onSaveReport: PropTypes.func,
    onShowReport: PropTypes.func,
    reportSave: PropTypes.shape({
        status: PropTypes.oneOf(['saving', 'saved', 'error']),
        path: PropTypes.string,
        fileName: PropTypes.string,
        onDesktop: PropTypes.bool,
        downloaded: PropTypes.bool,
        message: PropTypes.string
    })
};

export default CrashMessage;
