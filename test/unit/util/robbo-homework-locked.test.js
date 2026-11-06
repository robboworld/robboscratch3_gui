jest.mock('../../../src/lib/robbo-account/robboAccountClient', () => Object.assign(
    {},
    require.requireActual('../../../src/lib/robbo-account/robboAccountClient'),
    {
        downloadProjectSb3: jest.fn(),
        getProjectPage: jest.fn(),
        uploadProjectSb3: jest.fn(),
        touchEditing: jest.fn(),
        uploadProjectPreview: jest.fn(),
        updateProjectPage: jest.fn()
    }
));

import {
    followEditingThunk,
    loadCloudProjectIntoEditorThunk,
    saveToCloudThunk,
    updateCloudProjectTitleThunk
} from '../../../src/RobboGui/actions/robboAccountActions';
import {
    downloadProjectSb3,
    getProjectPage,
    isOwnHomeworkLocked,
    isTeacherEditing,
    touchEditing,
    uploadProjectSb3,
    updateProjectPage
} from '../../../src/lib/robbo-account/robboAccountClient';
import {closeAlertsWithId, showStandardAlert} from '../../../src/reducers/alerts';
import {
    ROBBO_ACCOUNT_SAVE_FAILURE,
    ROBBO_ACCOUNT_TITLE_SAVE_SUCCESS
} from '../../../src/RobboGui/reducers/robboAccount';
import {setProjectUnchanged} from '../../../src/reducers/project-changed';
import {setProjectTitle} from '../../../src/reducers/project-title';

// What throwHttpError makes of ЛК's 409 {"error":"HOMEWORK_LOCKED","code":"HOMEWORK_LOCKED"}.
const lockedError = () => {
    const err = new Error('HOMEWORK_LOCKED');
    err.status = 409;
    err.errorCode = 'HOMEWORK_LOCKED';
    return err;
};

const stateWithCloudProject = () => ({
    scratchGui: {
        robboAccount: {sessionStatus: 'authenticated', cloudProjectPageId: 'p1'},
        vm: {saveProjectSb3: () => Promise.resolve(new Blob(['sb3']))},
        projectTitle: 'Задание'
    }
});

const notFound = () => {
    const err = new Error('project file not found');
    err.status = 404;
    return err;
};

describe('isOwnHomeworkLocked', () => {
    test('only the owner of a locked copy is warned', () => {
        expect(isOwnHomeworkLocked({reviewLocked: true, isOwner: true})).toBe(true);
        expect(isOwnHomeworkLocked({reviewLocked: true, isOwner: false})).toBe(false);
        expect(isOwnHomeworkLocked({reviewLocked: false, isOwner: true})).toBe(false);
        expect(isOwnHomeworkLocked({isOwner: true})).toBe(false);
        expect(isOwnHomeworkLocked(null)).toBe(false);
    });
});

describe('handed-in homework (HOMEWORK_LOCKED)', () => {
    beforeEach(() => {
        downloadProjectSb3.mockReset();
        getProjectPage.mockReset();
        uploadProjectSb3.mockReset();
        updateProjectPage.mockReset();
    });

    test('a refused save reports HOMEWORK_LOCKED and keeps the project unsaved', () => {
        uploadProjectSb3.mockReturnValue(Promise.reject(lockedError()));
        const dispatch = jest.fn();
        return saveToCloudThunk()(dispatch, stateWithCloudProject).then(saved => {
            expect(saved).toBe(false);
            const types = dispatch.mock.calls.map(([action]) => action.type);
            expect(types).toContain(ROBBO_ACCOUNT_SAVE_FAILURE);
            expect(dispatch).not.toHaveBeenCalledWith(setProjectUnchanged());
            const failure = dispatch.mock.calls.find(([action]) => action.type === ROBBO_ACCOUNT_SAVE_FAILURE)[0];
            expect(failure.payload.message).toBe('HOMEWORK_LOCKED');
            expect(updateProjectPage).not.toHaveBeenCalled();
            expect(dispatch).toHaveBeenCalledWith(showStandardAlert('homeworkLocked'));
        });
    });

    test('opening own handed-in homework warns at once', () => {
        getProjectPage.mockReturnValue(Promise.resolve({
            projectPage: {title: 'Задание', reviewLocked: true, isOwner: true}
        }));
        downloadProjectSb3.mockReturnValue(Promise.reject(notFound()));
        const dispatch = jest.fn();
        return loadCloudProjectIntoEditorThunk('p1', {updateUrl: false})(dispatch, stateWithCloudProject)
            .then(() => {
                expect(dispatch).toHaveBeenCalledWith(showStandardAlert('homeworkLocked'));
            });
    });

    test('opening a draft or someone else\'s locked copy shows no warning', () => {
        getProjectPage.mockReturnValue(Promise.resolve({
            projectPage: {title: 'Задание', reviewLocked: true, isOwner: false}
        }));
        downloadProjectSb3.mockReturnValue(Promise.reject(notFound()));
        const dispatch = jest.fn();
        return loadCloudProjectIntoEditorThunk('p1', {updateUrl: false})(dispatch, stateWithCloudProject)
            .then(() => {
                expect(dispatch).not.toHaveBeenCalledWith(showStandardAlert('homeworkLocked'));
                expect(dispatch).toHaveBeenCalledWith(closeAlertsWithId('homeworkLocked'));
            });
    });

    test('a refused rename says so instead of "title changed"', () => {
        updateProjectPage.mockReturnValue(Promise.reject(lockedError()));
        const dispatch = jest.fn();
        return updateCloudProjectTitleThunk('Другое')(dispatch, stateWithCloudProject).then(() => {
            const types = dispatch.mock.calls.map(([action]) => action.type);
            expect(types).toContain(ROBBO_ACCOUNT_SAVE_FAILURE);
            expect(types).not.toContain(ROBBO_ACCOUNT_TITLE_SAVE_SUCCESS);
        });
    });
});

describe('a teacher editing a student\'s work', () => {
    const refused = (status, code) => {
        const err = new Error(code);
        err.status = status;
        err.errorCode = code;
        return err;
    };

    beforeEach(() => {
        downloadProjectSb3.mockReset();
        getProjectPage.mockReset();
        uploadProjectSb3.mockReset();
        updateProjectPage.mockReset();
    });

    test('isTeacherEditing follows ЛК', () => {
        expect(isTeacherEditing({teacherCanEdit: true})).toBe(true);
        expect(isTeacherEditing({isOwner: false})).toBe(false);
        expect(isTeacherEditing(null)).toBe(false);
    });

    test('opening work on review warns the teacher', () => {
        getProjectPage.mockReturnValue(Promise.resolve({
            projectPage: {title: 'Задание', reviewLocked: true, isOwner: false, teacherCanEdit: true}
        }));
        downloadProjectSb3.mockReturnValue(Promise.reject(notFound()));
        const dispatch = jest.fn();
        return loadCloudProjectIntoEditorThunk('p1', {updateUrl: false})(dispatch, stateWithCloudProject)
            .then(() => {
                expect(dispatch).toHaveBeenCalledWith(showStandardAlert('teacherEditing'));
            });
    });

    test('opening anything else takes the warning away', () => {
        getProjectPage.mockReturnValue(Promise.resolve({
            projectPage: {title: 'Задание', reviewLocked: false, isOwner: false}
        }));
        downloadProjectSb3.mockReturnValue(Promise.reject(notFound()));
        const dispatch = jest.fn();
        return loadCloudProjectIntoEditorThunk('p1', {updateUrl: false})(dispatch, stateWithCloudProject)
            .then(() => {
                expect(dispatch).toHaveBeenCalledWith(closeAlertsWithId('teacherEditing'));
            });
    });

    test('a save refused because the work is back with the student says so', () => {
        uploadProjectSb3.mockReturnValue(Promise.reject(refused(409, 'WORK_NOT_WITH_TEACHER')));
        const dispatch = jest.fn();
        return saveToCloudThunk()(dispatch, stateWithCloudProject).then(saved => {
            expect(saved).toBe(false);
            const failure = dispatch.mock.calls.find(([action]) => action.type === ROBBO_ACCOUNT_SAVE_FAILURE)[0];
            expect(failure.payload.message).toBe('WORK_NOT_WITH_TEACHER');
            expect(dispatch).toHaveBeenCalledWith(showStandardAlert('workNotWithTeacher'));
            expect(dispatch).not.toHaveBeenCalledWith(setProjectUnchanged());
        });
    });

    test('a refused rename puts the student\'s title back', () => {
        updateProjectPage.mockReturnValue(Promise.reject(refused(403, 'update_project_http')));
        const dispatch = jest.fn();
        return updateCloudProjectTitleThunk('Другое')(dispatch, stateWithCloudProject).then(() => {
            const types = dispatch.mock.calls.map(([action]) => action.type);
            expect(types).not.toContain(ROBBO_ACCOUNT_TITLE_SAVE_SUCCESS);
            expect(dispatch).toHaveBeenLastCalledWith({
                type: ROBBO_ACCOUNT_SAVE_FAILURE,
                payload: {message: 'TITLE_NOT_SAVED'}
            });
            expect(dispatch).toHaveBeenCalledWith(setProjectTitle('Задание'));
        });
    });
});

describe('editing signal to ЛК', () => {
    // thunk within thunk: the plain jest.fn() dispatch does not run them.
    const run = thunk => {
        const actions = [];
        const dispatch = action => {
            if (typeof action === 'function') {
                return action(dispatch);
            }
            actions.push(action);
            return action;
        };
        return Promise.resolve(dispatch(thunk)).then(() => actions);
    };

    beforeEach(() => {
        jest.useFakeTimers();
        touchEditing.mockReset();
    });

    afterEach(() => {
        // The module timer must not leak into the next test.
        run(followEditingThunk('p1', null));
        jest.useRealTimers();
    });

    test('nothing is sent for a project that is not tracked', () => run(
        followEditingThunk('p1', {editingTracked: false})
    ).then(() => {
        jest.runTimersToTime(120000);
        expect(touchEditing).not.toHaveBeenCalled();
    }));

    test('sends at once and then repeats', () => {
        touchEditing.mockReturnValue(Promise.resolve({tracked: true}));
        return run(followEditingThunk('p1', {editingTracked: true})).then(() => {
            expect(touchEditing).toHaveBeenCalledTimes(1);
            jest.runTimersToTime(60000);
            expect(touchEditing).toHaveBeenCalledTimes(3);
        });
    });

    test('warns while someone else has the work open', () => {
        touchEditing.mockReturnValue(Promise.resolve({tracked: true, others: [{role: 'teacher'}]}));
        return run(followEditingThunk('p1', {editingTracked: true})).then(actions => {
            expect(actions).toContainEqual(showStandardAlert('someoneElseEditing'));
        });
    });

    test('opening another project stops the signal of the last one', () => {
        touchEditing.mockReturnValue(Promise.resolve({tracked: true}));
        return run(followEditingThunk('p1', {editingTracked: true}))
            .then(() => run(followEditingThunk('p2', null)))
            .then(actions => {
                expect(actions).toContainEqual(closeAlertsWithId('someoneElseEditing'));
                touchEditing.mockClear();
                jest.runTimersToTime(120000);
                expect(touchEditing).not.toHaveBeenCalled();
            });
    });

    test('a failed signal does not reach the person', () => {
        touchEditing.mockReturnValue(Promise.reject(new Error('network')));
        return run(followEditingThunk('p1', {editingTracked: true})).then(actions => {
            expect(actions).not.toContainEqual(showStandardAlert('someoneElseEditing'));
        });
    });
});
