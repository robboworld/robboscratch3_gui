import log from '../../lib/log';
import dataURItoBlob from '../../lib/data-uri-to-blob';
import {
    getSessionStatus,
    signIn,
    createProjectPage,
    updateProjectPage,
    uploadProjectSb3,
    uploadProjectPreview,
    clearAccessTokenMemory
} from '../../lib/robbo-account/robboAccountClient';
import {
    oidcLogoutUrl,
    resolveLkBase,
    canonicalizeLoopbackEditorHost
} from '../../lib/robbo-account/robboAccountConfig';
import {
    ROBBO_ACCOUNT_SESSION_START,
    ROBBO_ACCOUNT_SESSION_SUCCESS,
    ROBBO_ACCOUNT_SESSION_FAILURE,
    ROBBO_ACCOUNT_SET_CLOUD_PROJECT,
    ROBBO_ACCOUNT_SAVE_START,
    ROBBO_ACCOUNT_SAVE_SUCCESS,
    ROBBO_ACCOUNT_SAVE_FAILURE,
    ROBBO_ACCOUNT_CLEAR_SAVE_STATUS,
    ROBBO_ACCOUNT_SIGN_OUT
} from '../reducers/robboAccount';
import {setProjectTitle} from '../../reducers/project-title';

function displayNameFromStatus (status) {
    if (!status) {
        return '';
    }
    const email = (status.email || '').trim();
    if (email) {
        const at = email.indexOf('@');
        return at > 0 ? email.slice(0, at) : email;
    }
    return (status.sub || status.edx_user_id || '').trim();
}

function lmsPasswordFallbackFromStatus (status) {
    if (status && typeof status.lms_password_fallback === 'boolean') {
        return status.lms_password_fallback;
    }
    return undefined;
}

export function setCloudProjectPageId (cloudProjectPageId) {
    return {
        type: ROBBO_ACCOUNT_SET_CLOUD_PROJECT,
        payload: {cloudProjectPageId: cloudProjectPageId || ''}
    };
}

export function clearSaveStatus () {
    return {type: ROBBO_ACCOUNT_CLEAR_SAVE_STATUS};
}

export function checkSessionThunk () {
    return function (dispatch) {
        if (canonicalizeLoopbackEditorHost()) {
            return Promise.resolve();
        }
        dispatch({type: ROBBO_ACCOUNT_SESSION_START});
        return getSessionStatus()
            .then(status => {
                const lmsPasswordFallback = lmsPasswordFallbackFromStatus(status);
                if (status && status.authenticated) {
                    dispatch({
                        type: ROBBO_ACCOUNT_SESSION_SUCCESS,
                        payload: {
                            user: {
                                email: status.email || '',
                                edxUserId: status.edx_user_id || '',
                                sub: status.sub || '',
                                role: status.role || 0,
                                displayName: displayNameFromStatus(status)
                            },
                            lmsPasswordFallback: typeof lmsPasswordFallback === 'boolean' ?
                                lmsPasswordFallback : undefined
                        }
                    });
                    return status;
                }
                dispatch({
                    type: ROBBO_ACCOUNT_SESSION_FAILURE,
                    payload: {
                        anonymous: true,
                        lmsPasswordFallback: typeof lmsPasswordFallback === 'boolean' ?
                            lmsPasswordFallback : undefined
                    }
                });
                return status;
            })
            .catch(err => {
                log.warn('robbo account session check failed', err);
                dispatch({
                    type: ROBBO_ACCOUNT_SESSION_FAILURE,
                    payload: {anonymous: true, message: err && err.message}
                });
            });
    };
}

/**
 * Capture stage snapshot the same way as project-saver-hoc storeProjectThumbnail.
 * @param {object} vm
 * @returns {Promise<Blob|null>}
 */
function captureStageThumbnail (vm) {
    return new Promise(resolve => {
        try {
            if (!vm || !vm.renderer || typeof vm.renderer.requestSnapshot !== 'function') {
                resolve(null);
                return;
            }
            vm.postIOData('video', {forceTransparentPreview: true});
            vm.renderer.requestSnapshot(dataURI => {
                try {
                    vm.postIOData('video', {forceTransparentPreview: false});
                } catch (e) { /* ignore */ }
                try {
                    resolve(dataURItoBlob(dataURI));
                } catch (e) {
                    resolve(null);
                }
            });
            vm.renderer.draw();
        } catch (e) {
            log.warn('thumbnail capture failed', e);
            resolve(null);
        }
    });
}

/**
 * @param {{asCopy?: boolean}} [options]
 */
export function saveToCloudThunk (options) {
    const asCopy = !!(options && options.asCopy);
    return function (dispatch, getState) {
        const state = getState();
        const account = state.scratchGui.robboAccount || {};
        const vm = state.scratchGui.vm;
        const projectTitle = state.scratchGui.projectTitle || '';
        if (!vm || typeof vm.saveProjectSb3 !== 'function') {
            dispatch({
                type: ROBBO_ACCOUNT_SAVE_FAILURE,
                payload: {message: 'vm_unavailable'}
            });
            return Promise.resolve();
        }
        if (account.sessionStatus !== 'authenticated') {
            dispatch({
                type: ROBBO_ACCOUNT_SAVE_FAILURE,
                payload: {message: 'not_authenticated'}
            });
            return Promise.resolve();
        }

        dispatch({type: ROBBO_ACCOUNT_SAVE_START});

        const existingId = account.cloudProjectPageId || '';
        const needCreate = asCopy || !existingId;

        return Promise.resolve()
            .then(() => {
                if (needCreate) {
                    return createProjectPage().then(resp => {
                        const page = resp && resp.projectPage;
                        const id = page && (page.projectPageId || page.projectPageID);
                        if (!id) {
                            throw new Error('create_project_no_id');
                        }
                        return id;
                    });
                }
                return existingId;
            })
            .then(projectPageId => vm.saveProjectSb3().then(blob => ({projectPageId, blob})))
            .then(({projectPageId, blob}) => uploadProjectSb3(projectPageId, blob)
                .then(() => ({projectPageId})))
            .then(({projectPageId}) => {
                const title = (projectTitle || '').trim();
                if (!title) {
                    return {projectPageId};
                }
                return updateProjectPage({
                    projectPageId,
                    title
                }).then(() => ({projectPageId})).catch(err => {
                    // Title sync is best-effort; sb3 already uploaded.
                    log.warn('cloud title update failed', err);
                    return {projectPageId};
                });
            })
            .then(({projectPageId}) => captureStageThumbnail(vm).then(thumb => {
                if (!thumb) {
                    return {projectPageId};
                }
                return uploadProjectPreview(projectPageId, thumb)
                    .then(() => ({projectPageId}))
                    .catch(err => {
                        log.warn('cloud preview upload failed', err);
                        return {projectPageId};
                    });
            }))
            .then(({projectPageId}) => {
                dispatch({
                    type: ROBBO_ACCOUNT_SAVE_SUCCESS,
                    payload: {cloudProjectPageId: projectPageId}
                });
                // Clear success banner after a short delay.
                setTimeout(() => {
                    dispatch(clearSaveStatus());
                }, 2500);
            })
            .catch(err => {
                log.warn('cloud save failed', err);
                dispatch({
                    type: ROBBO_ACCOUNT_SAVE_FAILURE,
                    payload: {message: (err && err.message) || 'save_failed'}
                });
            });
    };
}

/**
 * Persist project title to ЛК when editing a cloud project.
 * @param {string} newTitle
 */
export function updateCloudProjectTitleThunk (newTitle) {
    return function (dispatch, getState) {
        const title = (newTitle || '').trim();
        dispatch(setProjectTitle(title));
        const account = getState().scratchGui.robboAccount || {};
        const id = account.cloudProjectPageId;
        if (!id || account.sessionStatus !== 'authenticated') {
            return Promise.resolve();
        }
        return updateProjectPage({
            projectPageId: id,
            title
        }).catch(err => {
            log.warn('cloud rename failed', err);
        });
    };
}

function navigateTop (url) {
    try {
        if (typeof window !== 'undefined' && window.top && window.top !== window) {
            window.top.location.href = url;
            return;
        }
    } catch (e) { /* cross-origin top — fall through */ }
    if (typeof window !== 'undefined') {
        window.location.href = url;
    }
}

/**
 * Inline dropdown password sign-in (MIT-style). Uses POST /auth/sign-in.
 * @param {string} email
 * @param {string} password
 * @returns {function} thunk → Promise<{ok: boolean, status?: number, errorCode?: string}>
 */
export function signInWithPasswordThunk (email, password) {
    return function (dispatch) {
        dispatch({type: ROBBO_ACCOUNT_SESSION_START});
        return signIn(email, password)
            .then(() => dispatch(checkSessionThunk()))
            .then(status => ({ok: !!(status && status.authenticated)}))
            .catch(err => {
                dispatch({
                    type: ROBBO_ACCOUNT_SESSION_FAILURE,
                    payload: {anonymous: true}
                });
                return {
                    ok: false,
                    status: err && err.status,
                    errorCode: err && err.errorCode
                };
            });
    };
}

export function signOutThunk () {
    return function (dispatch) {
        clearAccessTokenMemory();
        dispatch({type: ROBBO_ACCOUNT_SIGN_OUT});
        const target = oidcLogoutUrl(`${resolveLkBase()}/login`);
        navigateTop(target);
    };
}
