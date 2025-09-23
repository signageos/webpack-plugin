import codeStyle from '@signageos/codestyle/eslint.config.mjs';
import tseslint from 'typescript-eslint';

/** @type {import("typescript-eslint").Config} */
const config = tseslint.config(
    {
        ignores: [
            'config/**/*',
            '.prettierrc.js',
            'eslint.config.mjs',
            'test/**/*.ts',
            '**/*.json',
            '*.md',
        ]
    },
    ...codeStyle,
    {
        files: ['src/**/*.ts', 'test/**/*.ts'],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: ['./tsconfig.json', './tsconfig.test.json'],
            },
        },
    }
);

export default config;