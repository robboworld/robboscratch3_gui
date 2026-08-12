import bindAll from 'lodash.bindall';
import React from 'react';
import PropTypes from 'prop-types';
import queryString from 'query-string';
import {connect} from 'react-redux';
import VM from 'scratch-vm';

import {
    LoadingState,
    onLoadedProject,
    projectError,
    requestProjectUpload,
    setProjectId
} from '../reducers/project-state';

/**
 * Loads a project from signed playUrl/jsonUrl query params (LK iframe embed).
 * Falls back to hash / projectRef when URLs are absent.
 * Handles parent postMessage commands: scratch:greenFlag / scratch:stopAll.
 */
const EmbedProjectLoaderHOC = function (WrappedComponent) {
    class EmbedProjectLoaderComponent extends React.Component {
        constructor (props) {
            super(props);
            bindAll(this, [
                'loadFromSignedUrls',
                'notifyParent',
                'handleParentMessage',
                'runGreenFlag',
                'clickNativeGreenFlagOverlay',
                'stopAll',
                'onVmRunStart',
                'onVmRunStop'
            ]);
            const q = typeof window !== 'undefined' ? queryString.parse(window.location.search) : {};
            this.embedMode = q.embed === '1';
            this.hasSignedUrls = Boolean(q.playUrl || q.jsonUrl);
            this.projectReady = false;
            this.pendingGreenFlag = false;
        }
        componentDidMount () {
            if (this.embedMode && typeof window !== 'undefined') {
                window.onbeforeunload = null;
                window.addEventListener('message', this.handleParentMessage);
                window.__lkEmbedApi = {
                    greenFlag: this.runGreenFlag,
                    stopAll: this.stopAll
                };
            }
            if (this.props.vm) {
                this.props.vm.on('PROJECT_RUN_START', this.onVmRunStart);
                this.props.vm.on('PROJECT_RUN_STOP', this.onVmRunStop);
            }
            if (this.hasSignedUrls) {
                this.loadFromSignedUrls();
                return;
            }
            const q = queryString.parse(window.location.search);
            if (q.projectRef) {
                this.props.setProjectId(String(q.projectRef));
            }
        }
        componentWillUnmount () {
            if (typeof window !== 'undefined') {
                window.removeEventListener('message', this.handleParentMessage);
                if (window.__lkEmbedApi) {
                    delete window.__lkEmbedApi;
                }
            }
            if (this.props.vm) {
                this.props.vm.removeListener('PROJECT_RUN_START', this.onVmRunStart);
                this.props.vm.removeListener('PROJECT_RUN_STOP', this.onVmRunStop);
            }
        }
        onVmRunStart () {
            this.notifyParent('scratch:runStart');
        }
        onVmRunStop () {
            this.notifyParent('scratch:runStop');
        }
        notifyParent (type, payload) {
            if (!this.embedMode || typeof window === 'undefined' || window.parent === window) {
                return;
            }
            window.parent.postMessage(Object.assign({type}, payload || {}), '*');
        }
        runGreenFlag () {
            const vm = this.props.vm;
            if (!this.projectReady) {
                this.pendingGreenFlag = true;
                // Still try DOM click in case overlay is already mounted.
                this.clickNativeGreenFlagOverlay();
                return;
            }
            this.pendingGreenFlag = false;
            if (this.clickNativeGreenFlagOverlay()) {
                return;
            }
            if (!vm) return;
            const kick = () => {
                try {
                    if (typeof vm.start === 'function') vm.start();
                    if (typeof vm.greenFlag === 'function') vm.greenFlag();
                } catch (e) {
                    this.notifyParent('scratch:error', {message: String(e && e.message ? e.message : e)});
                }
            };
            kick();
            window.setTimeout(kick, 50);
            window.setTimeout(kick, 200);
        }
        clickNativeGreenFlagOverlay () {
            if (typeof document === 'undefined') return false;
            const el = document.querySelector('[class*="green-flag-overlay-wrapper"]');
            if (!el) return false;
            try {
                el.click();
                return true;
            } catch (e) {
                return false;
            }
        }
        stopAll () {
            const vm = this.props.vm;
            this.pendingGreenFlag = false;
            if (!vm) {
                this.notifyParent('scratch:runStop');
                return;
            }
            try {
                if (typeof vm.stopAll === 'function') {
                    vm.stopAll();
                }
                if (vm.runtime && typeof vm.runtime.stopAll === 'function') {
                    vm.runtime.stopAll();
                }
            } catch (e) {
                // ignore
            }
            // Native stop control in player chrome (if present).
            try {
                const stopEl = document.querySelector(
                    '[class*="stop-all_stop-all"], [class*="stop-all"], button[title*="Stop"], button[aria-label*="Stop"]'
                );
                if (stopEl) stopEl.click();
            } catch (e) {
                // ignore
            }
            this.notifyParent('scratch:runStop');
        }
        handleParentMessage (event) {
            if (!this.embedMode || !event || !event.data || !event.data.type) return;
            if (event.data.type === 'scratch:greenFlag' || event.data.type === 'scratch:clickGreenFlag') {
                this.runGreenFlag();
            } else if (event.data.type === 'scratch:stopAll') {
                this.stopAll();
            }
        }
        loadFromSignedUrls () {
            const q = queryString.parse(window.location.search);
            const uploadAction = requestProjectUpload(this.props.loadingState);
            if (!uploadAction) {
                const err = new Error('Cannot load embedded project in current state');
                this.props.onError(err);
                this.notifyParent('scratch:error', {message: String(err)});
                return;
            }
            this.props.dispatchRequestProjectUpload(uploadAction);

            const loadIntoVm = projectData =>
                this.props.vm.loadProject(projectData)
                    .then(() => {
                        this.props.onLoadedProject(LoadingState.LOADING_VM_FILE_UPLOAD, false);
                        this.projectReady = true;
                        this.notifyParent('scratch:ready');
                        if (this.pendingGreenFlag) {
                            this.runGreenFlag();
                        }
                    });

            const tryJson = () => {
                if (!q.jsonUrl) {
                    return Promise.reject(new Error('jsonUrl missing'));
                }
                return fetch(q.jsonUrl)
                    .then(res => {
                        if (!res.ok) throw new Error(`jsonUrl HTTP ${res.status}`);
                        return res.json();
                    })
                    .then(json => loadIntoVm(json));
            };
            const tryPlay = () => {
                if (!q.playUrl) {
                    return tryJson();
                }
                return fetch(q.playUrl)
                    .then(res => {
                        if (!res.ok) throw new Error(`playUrl HTTP ${res.status}`);
                        return res.arrayBuffer();
                    })
                    .then(buf => {
                        // Empty / non-zip bodies make scratch-vm throw FixedAsciiString via SB1 fallback.
                        const bytes = new Uint8Array(buf);
                        const looksZip = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
                        if (!looksZip) {
                            throw new Error('playUrl did not return a .sb3 zip');
                        }
                        return loadIntoVm(buf);
                    })
                    .catch(playErr => tryJson().catch(() => Promise.reject(playErr)));
            };
            tryPlay().catch(err => {
                this.props.onError(err);
                const raw = String(err && err.message ? err.message : err);
                const isInvalid = raw.indexOf('validationError') !== -1 ||
                    raw.indexOf('Could not parse as a valid SB2 or SB3') !== -1 ||
                    raw.indexOf('playUrl did not return a .sb3') !== -1;
                this.notifyParent('scratch:error', {
                    message: isInvalid ? 'INVALID_PROJECT_FILE' : raw
                });
            });
        }
        render () {
            const {
                loadingState,
                onError,
                onLoadedProject: onLoadedProjectProp,
                dispatchRequestProjectUpload,
                vm,
                setProjectId: setProjectIdProp,
                ...componentProps
            } = this.props;
            return (
                <WrappedComponent
                    {...componentProps}
                    embedMode={this.embedMode}
                    skipHashParser={this.hasSignedUrls}
                />
            );
        }
    }
    EmbedProjectLoaderComponent.propTypes = {
        dispatchRequestProjectUpload: PropTypes.func,
        loadingState: PropTypes.string,
        onError: PropTypes.func,
        onLoadedProject: PropTypes.func,
        setProjectId: PropTypes.func,
        vm: PropTypes.instanceOf(VM)
    };
    const mapStateToProps = state => ({
        loadingState: state.scratchGui.projectState.loadingState,
        vm: state.scratchGui.vm
    });
    const mapDispatchToProps = dispatch => ({
        dispatchRequestProjectUpload: action => dispatch(action),
        onError: error => dispatch(projectError(error)),
        onLoadedProject: (loadingState, canSave) =>
            dispatch(onLoadedProject(loadingState, canSave, true)),
        setProjectId: projectId => dispatch(setProjectId(projectId))
    });
    return connect(mapStateToProps, mapDispatchToProps)(EmbedProjectLoaderComponent);
};

export default EmbedProjectLoaderHOC;
