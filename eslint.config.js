import { defineConfig } from 'eslint/config'
import stylisticEslintPluginTs from '@stylistic/eslint-plugin-ts'
import typescriptEslintEslintPlugin from '@typescript-eslint/eslint-plugin'
import globals from 'globals'
import tsParser from '@typescript-eslint/parser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({
  baseDirectory: path.dirname(fileURLToPath(import.meta.url)),
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
})

export default defineConfig([{
  extends: compat.extends('eslint:recommended', 'plugin:@typescript-eslint/recommended'),
  plugins: {
    '@stylistic/ts': stylisticEslintPluginTs,
    '@typescript-eslint': typescriptEslintEslintPlugin
  },
  languageOptions: {
    globals: {
      ...globals.node
    },
    parser: tsParser,
    ecmaVersion: 2024,
    sourceType: 'commonjs'
  },
  rules: {
    '@stylistic/ts/indent': ['error', 2],
    '@typescript-eslint/array-type': 'error',
    '@typescript-eslint/prefer-function-type': 'error',
    '@typescript-eslint/member-ordering': ['error', {
      default: [
        'public-static-field',
        'protected-static-field',
        'private-static-field',
        'public-instance-field',
        'protected-instance-field',
        'private-instance-field',
        'public-constructor',
        'protected-constructor',
        'private-constructor',
        'private-instance-method',
        'protected-instance-method',
        'public-instance-method'
      ]
    }],
    '@typescript-eslint/method-signature-style': ['error', 'method'],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/prefer-for-of': 'error',
    '@typescript-eslint/unified-signatures': 'error',
    'arrow-parens': ['error', 'as-needed'],
    'arrow-body-style': 'error',
    curly: ['error', 'multi-line'],
    'dot-notation': 'error',
    eqeqeq: ['error', 'always', {
      null: 'ignore'
    }],
    'func-names': 'error',
    'max-len': ['error', {
      code: 100,
      ignoreUrls: true
    }],
    'no-eval': 'error',
    'no-irregular-whitespace': 'off',
    'no-new-wrappers': 'error',
    'no-prototype-builtins': 'off',
    'no-throw-literal': 'error',
    'no-trailing-spaces': ['error', {
      ignoreComments: true
    }],
    'no-var': 'error',
    'object-shorthand': 'error',
    'one-var': ['error', 'never'],
    radix: 'error'
  }
}, {
  // Rules that require type information or conflict with `standard` should not be applied to js
  // files, only ts files.
  files: ['**/*.ts'],
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'script',
    parserOptions: {
      project: './tsconfig.json'
    }
  },
  rules: {
    '@stylistic/ts/comma-dangle': ['error', {
      arrays: 'always-multiline',
      exports: 'always-multiline',
      functions: 'only-multiline',
      imports: 'always-multiline',
      objects: 'always-multiline'
    }],
    '@stylistic/ts/quotes': ['error', 'double', {
      allowTemplateLiterals: true,
      avoidEscape: true
    }],
    '@stylistic/ts/semi': 'error',
    '@typescript-eslint/explicit-member-accessibility': ['error', {
      overrides: {
        constructors: 'no-public'
      }
    }],
    '@typescript-eslint/naming-convention': ['error', {
      format: ['camelCase', 'PascalCase'],
      leadingUnderscore: 'allowSingleOrDouble',
      selector: 'variable'
    }],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-shadow': 'error',
    '@typescript-eslint/no-unnecessary-qualifier': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    '@typescript-eslint/no-var-requires': 'error',
    '@typescript-eslint/return-await': 'error',
    'sort-imports': ['error', {
      ignoreCase: true,
      allowSeparatedGroups: true
    }]
  }
}])
