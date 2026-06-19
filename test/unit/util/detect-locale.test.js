import {detectLocale, resolveStartupLocale} from '../../../src/lib/detect-locale.js';
import {STORAGE_KEY} from '../../../src/lib/layout-visibility-persistence.js';

const supportedLocales = ['en', 'es', 'pt-br', 'de', 'it', 'ru'];

Object.defineProperty(window.location,
    'search',
    {value: '?name=val', configurable: true}
);
Object.defineProperty(window.navigator,
    'language',
    {value: 'en-US', configurable: true}
);

describe('detectLocale', () => {
    test('uses locale from the URL when present', () => {
        Object.defineProperty(window.location,
            'search',
            {value: '?locale=pt-br'}
        );
        expect(detectLocale(supportedLocales)).toEqual('pt-br');
    });

    test('is case insensitive', () => {
        Object.defineProperty(window.location,
            'search',
            {value: '?locale=pt-BR'}
        );
        expect(detectLocale(supportedLocales)).toEqual('pt-br');
    });

    test('also accepts lang from the URL when present', () => {
        Object.defineProperty(window.location,
            'search',
            {value: '?lang=it'}
        );
        expect(detectLocale(supportedLocales)).toEqual('it');
    });

    test('ignores unsupported locales', () => {
        Object.defineProperty(window.location,
            'search',
            {value: '?lang=sv'}
        );
        expect(detectLocale(supportedLocales)).toEqual('en');
    });

    test('ignores other parameters', () => {
        Object.defineProperty(window.location,
            'search',
            {value: '?enable=language'}
        );
        expect(detectLocale(supportedLocales)).toEqual('en');
    });

    test('uses navigator language property for default if supported', () => {
        Object.defineProperty(window.navigator,
            'language',
            {value: 'pt-BR'}
        );
        expect(detectLocale(supportedLocales)).toEqual('pt-br');
    });

    test('ignores navigator language property if unsupported', () => {
        Object.defineProperty(window.navigator,
            'language',
            {value: 'da'}
        );
        expect(detectLocale(supportedLocales)).toEqual('en');
    });

    test('works with an empty locale', () => {
        Object.defineProperty(window.navigator,
            'language',
            {value: 'en-US', configurable: true}
        );
        Object.defineProperty(window.location,
            'search',
            {value: '?locale='}
        );
        expect(detectLocale(supportedLocales)).toEqual('en');
    });

    test('if multiple, uses the first locale', () => {
        Object.defineProperty(window.location,
            'search',
            {value: '?locale=de&locale=en'}
        );
        expect(detectLocale(supportedLocales)).toEqual('de');
    });
});

describe('resolveStartupLocale', () => {
    let storage;

    beforeEach(() => {
        storage = {};
        window.localStorage = {
            getItem: key => (Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null),
            setItem: (key, value) => {
                storage[key] = String(value);
            },
            removeItem: key => {
                delete storage[key];
            }
        };
        Object.defineProperty(window.location,
            'search',
            {value: '?name=val', configurable: true}
        );
        Object.defineProperty(window.navigator,
            'language',
            {value: 'en-US', configurable: true}
        );
    });

    test('uses persisted locale when URL has no override', () => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            isRightPanelHidden: false,
            isBlocksPaletteCollapsed: false,
            blocksPaletteFlyoutWidth: 250,
            locale: 'de'
        }));
        expect(resolveStartupLocale(supportedLocales)).toEqual('de');
    });

    test('URL overrides persisted locale', () => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            isRightPanelHidden: false,
            isBlocksPaletteCollapsed: false,
            blocksPaletteFlyoutWidth: 250,
            locale: 'de'
        }));
        Object.defineProperty(window.location,
            'search',
            {value: '?locale=it', configurable: true}
        );
        expect(resolveStartupLocale(supportedLocales)).toEqual('it');
    });

    test('falls back to browser when storage has no locale', () => {
        Object.defineProperty(window.navigator,
            'language',
            {value: 'pt-BR', configurable: true}
        );
        expect(resolveStartupLocale(supportedLocales)).toEqual('pt-br');
    });
});
