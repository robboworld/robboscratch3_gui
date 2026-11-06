jest.mock('../../../src/lib/robbo-account/robboAccountClient', () => Object.assign(
    {},
    require.requireActual('../../../src/lib/robbo-account/robboAccountClient'),
    {
        createProjectPage: jest.fn(),
        listProjectPages: jest.fn()
    }
));

import {ensureCloudProjectPageThunk} from '../../../src/RobboGui/actions/robboAccountActions';
import {createProjectPage, listProjectPages} from '../../../src/lib/robbo-account/robboAccountClient';

const stateWith = isPlayerOnly => ({
    scratchGui: {
        locales: {locale: 'ru'},
        mode: {isPlayerOnly},
        robboAccount: {sessionStatus: 'authenticated'}
    }
});

describe('ensureCloudProjectPageThunk', () => {
    beforeEach(() => {
        createProjectPage.mockReset();
        listProjectPages.mockReset();
    });

    test('the player leaves the viewer\'s own projects alone', async () => {
        const dispatch = jest.fn();

        const id = await ensureCloudProjectPageThunk()(dispatch, () => stateWith(true));

        expect(id).toBe('');
        expect(listProjectPages).not.toHaveBeenCalled();
        expect(createProjectPage).not.toHaveBeenCalled();
        expect(dispatch).not.toHaveBeenCalled();
    });

    test('the editor still creates a project for a user without any', async () => {
        listProjectPages.mockReturnValue(Promise.resolve({projectPages: []}));
        createProjectPage.mockReturnValue(Promise.resolve({projectPage: {projectPageId: 'new-page'}}));

        const id = await ensureCloudProjectPageThunk()(jest.fn(), () => stateWith(false));

        expect(listProjectPages).toHaveBeenCalledTimes(1);
        expect(createProjectPage).toHaveBeenCalledWith('ru');
        expect(id).toBe('new-page');
    });
});
