import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import BrowserModalComponent from '../components/browser-modal/browser-modal.jsx';
import CrashMessageComponent from '../components/crash-message/crash-message.jsx';
import log from '../lib/log.js';
import {recordError} from '../lib/error-journal';
import {saveSupportReport, showReportInFolder} from '../lib/support-report';
import {recommendedBrowser} from '../lib/supported-browser';

class ErrorBoundary extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            error: null,
            errorInfo: null,
            reportSave: null
        };
        this.handleSaveReport = this.handleSaveReport.bind(this);
        this.handleShowReport = this.handleShowReport.bind(this);
    }

    /**
     * Handle an error caught by this ErrorBoundary component.
     * @param {Error} error - the error that was caught.
     * @param {React.ErrorInfo} errorInfo - the React error info associated with the error.
     */
    componentDidCatch (error, errorInfo) {
        error = error || {
            stack: 'Unknown stack',
            message: 'Unknown error'
        };
        errorInfo = errorInfo || {
            componentStack: 'Unknown component stack'
        };

        // only remember the first error: later errors might just be side effects of that first one
        if (!this.state.error) {
            // store error & errorInfo for debugging
            this.setState({
                error,
                errorInfo
            });
        }

        recordError('react', error, `action=${this.props.action}${errorInfo.componentStack}`);

        // report every error in the console
        log.error([
            `Unhandled Error with action='${this.props.action}': ${error.stack}`,
            `Component stack: ${errorInfo.componentStack}`
        ].join('\n'));
    }

    handleBack () {
        window.history.back();
    }

    // The intl tree may be what crashed: the report conclusions stay in English here
    handleSaveReport () {
        this.setState({reportSave: {status: 'saving'}});
        saveSupportReport()
            .then(saved => this.setState({
                reportSave: {
                    status: 'saved',
                    path: saved.path || '',
                    fileName: saved.fileName,
                    onDesktop: saved.onDesktop,
                    downloaded: saved.downloaded
                }
            }))
            .catch(error => this.setState({
                reportSave: {status: 'error', message: (error && error.message) || String(error)}
            }));
    }

    handleShowReport () {
        if (this.state.reportSave) showReportInFolder(this.state.reportSave.path);
    }

    handleReload () {
        window.location.replace(window.location.origin + window.location.pathname);
    }

    render () {
        if (this.state.error) {
            if (recommendedBrowser()) {
                return (
                    <CrashMessageComponent
                        errorMessage={String(this.state.error.message || this.state.error)}
                        reportSave={this.state.reportSave}
                        onReload={this.handleReload}
                        onSaveReport={this.handleSaveReport}
                        onShowReport={this.handleShowReport}
                    />
                );
            }
            return (<BrowserModalComponent
                error
                isRtl={this.props.isRtl}
                onBack={this.handleBack}
            />);
        }
        return this.props.children;
    }
}

ErrorBoundary.propTypes = {
    action: PropTypes.string.isRequired, // Used for defining tracking action
    children: PropTypes.node,
    isRtl: PropTypes.bool
};

const mapStateToProps = state => ({
    isRtl: state.locales.isRtl
});

// no-op function to prevent dispatch prop being passed to component
const mapDispatchToProps = () => ({});

export default connect(mapStateToProps, mapDispatchToProps)(ErrorBoundary);
