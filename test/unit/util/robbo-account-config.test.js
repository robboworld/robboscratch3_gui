import {resolveEditorLogoutReturnTo} from '../../../src/lib/robbo-account/robboAccountConfig.js';

const setLocation = ({search = '', hash = ''}) => {
    const fields = {protocol: 'https:', host: 'lk.example.com', pathname: '/scratch/', search, hash};
    Object.keys(fields).forEach(key => {
        Object.defineProperty(window.location, key, {value: fields[key], configurable: true});
    });
};

describe('resolveEditorLogoutReturnTo', () => {
    test('drops the cloud project params and keeps the rest', () => {
        setLocation({search: '?projectPageId=0b7f1f3e-1111-4222-8333-944445555666&locale=ru', hash: '#editor'});
        expect(resolveEditorLogoutReturnTo()).toBe('https://lk.example.com/scratch/?locale=ru#editor');
    });

    test('drops projectRef as well', () => {
        setLocation({search: '?projectRef=0b7f1f3e-1111-4222-8333-944445555666'});
        expect(resolveEditorLogoutReturnTo()).toBe('https://lk.example.com/scratch/');
    });

    test('keeps a plain editor URL as is', () => {
        setLocation({});
        expect(resolveEditorLogoutReturnTo()).toBe('https://lk.example.com/scratch/');
    });
});
