jest.mock('../../../src/lib/robbo-account/robboAccountClient', () => Object.assign(
    {},
    require.requireActual('../../../src/lib/robbo-account/robboAccountClient'),
    {
        downloadProjectSb3: jest.fn(),
        getProjectPage: jest.fn(),
        uploadProjectSb3: jest.fn(),
        uploadProjectPreview: jest.fn(),
        updateProjectPage: jest.fn()
    }
));

import {
    loadCloudProjectIntoEditorThunk,
    saveToCloudThunk,
    updateCloudProjectTitleThunk
} from '../../../src/RobboGui/actions/robboAccountActions';
import {
    downloadProjectSb3,
    getProjectPage,
    isOwnHomeworkLocked,
    uploadProjectSb3,
    updateProjectPage
} from '../../../src/lib/robbo-account/robboAccountClient';
import {closeAlertsWithId, showStandardAlert} from '../../../src/reducers/alerts';
import {
    ROBBO_ACCOUNT_SAVE_FAILURE,
    ROBBO_ACCOUNT_TITLE_SAVE_SUCCESS
} from '../../../src/RobboGui/reducers/robboAccount';
import {setProjectUnchanged} from '../../../src/reducers/project-changed';

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
