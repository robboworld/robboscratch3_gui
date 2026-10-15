import robboAccountReducer, {
    ROBBO_ACCOUNT_SESSION_FAILURE,
    ROBBO_ACCOUNT_SET_ENTITLEMENTS,
    ROBBO_ACCOUNT_SIGN_OUT
} from '../../../src/RobboGui/reducers/robboAccount.js';
import {
    CLOUD_PROJECT_LIMIT_REACHED,
    CLOUD_PROJECT_SIZE_EXCEEDED,
    isCloudLimitError
} from '../../../src/lib/robbo-account/cloudLimits.js';

const rights = {tariffName: 'Free', maxProjects: 20, projectCount: 7, maxProjectSizeMb: 10};

describe('account rights in the robboAccount state', () => {
    test('are stored as the ЛК returned them', () => {
        const state = robboAccountReducer(undefined, {type: ROBBO_ACCOUNT_SET_ENTITLEMENTS, payload: rights});
        expect(state.entitlements).toEqual(rights);
    });

    test('are forgotten on sign-out and on a lost session', () => {
        const signedIn = robboAccountReducer(undefined, {type: ROBBO_ACCOUNT_SET_ENTITLEMENTS, payload: rights});
        expect(robboAccountReducer(signedIn, {type: ROBBO_ACCOUNT_SIGN_OUT}).entitlements).toBeNull();
        const lost = robboAccountReducer(signedIn, {type: ROBBO_ACCOUNT_SESSION_FAILURE, payload: {anonymous: true}});
        expect(lost.entitlements).toBeNull();
    });
});

describe('cloud limit errors', () => {
    test('are the two tariff refusals of the ЛК', () => {
        expect(isCloudLimitError(CLOUD_PROJECT_SIZE_EXCEEDED)).toBe(true);
        expect(isCloudLimitError(CLOUD_PROJECT_LIMIT_REACHED)).toBe(true);
        expect(isCloudLimitError('save_failed')).toBe(false);
        expect(isCloudLimitError('')).toBe(false);
    });
});
