import {resolveLkBase} from './robboAccountConfig';

/** Cloud save refused by the account's tariff (`error` of the ЛК 409 answer). */
export const CLOUD_PROJECT_SIZE_EXCEEDED = 'PROJECT_SIZE_EXCEEDED';
export const CLOUD_PROJECT_LIMIT_REACHED = 'PROJECT_LIMIT_REACHED';

/**
 * @param {string} code saveError of the cloud save
 * @returns {boolean} true when the tariff's cloud limits refused the save
 */
export const isCloudLimitError = code =>
    code === CLOUD_PROJECT_SIZE_EXCEEDED || code === CLOUD_PROJECT_LIMIT_REACHED;

/** @returns {string} the ЛК page with the tariffs on sale */
export const tariffsPageUrl = () => `${resolveLkBase()}/licenses/buy`;

/** @returns {string} the ЛК page with the account's licences */
export const licensesPageUrl = () => `${resolveLkBase()}/licenses`;
