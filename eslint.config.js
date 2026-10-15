// ESLint flat config. Run with: npx eslint@9 .
const browserGlobals = Object.fromEntries([
    'window', 'document', 'navigator', 'localStorage', 'console', 'fetch', 'Response', 'URL',
    'URLSearchParams', 'AbortController', 'AbortSignal', 'DOMParser', 'FileReader', 'setTimeout',
    'clearTimeout', 'caches', 'self'
].map((name) => [name, 'readonly']));

export default [
    {
        files: ['script.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: { ...browserGlobals, L: 'readonly', toGeoJSON: 'readonly' }
        },
        rules: {
            'no-unused-vars': ['error', { caughtErrors: 'none' }],
            'no-undef': 'error'
        }
    },
    {
        files: ['service-worker.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: browserGlobals
        },
        rules: {
            'no-unused-vars': 'error',
            'no-undef': 'error'
        }
    }
];
