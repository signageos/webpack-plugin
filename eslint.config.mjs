import codeStyle from '@signageos/codestyle/eslint.config.mjs';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
                tsconfigRootDir: __dirname,
            },
        },
    }
);

export default config;