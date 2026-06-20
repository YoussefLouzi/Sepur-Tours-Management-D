import fioriTools from '@sap-ux/eslint-plugin-fiori-tools';

export default [
    {
        ignores: ['dist/**', 'webapp/test/**']
    },
    ...fioriTools.configs.recommended,
    {
        files: ['webapp/**/*.js'],
        rules: {
            'linebreak-style': 'off'
        }
    },
    {
        files: ['webapp/controller/home.controller.js'],
        rules: {
            '@sap-ux/fiori-tools/sap-no-localstorage': 'off',
            '@sap-ux/fiori-tools/sap-no-sessionstorage': 'off',
            '@sap-ux/fiori-tools/sap-no-location-reload': 'off'
        }
    }
];
