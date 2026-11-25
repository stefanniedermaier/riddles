import pluginVitest from '@vitest/eslint-plugin'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import { globalIgnores } from 'eslint/config'
import pluginVue from 'eslint-plugin-vue'

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,ts,mts,tsx}'],
  },

  globalIgnores(['**/dist/**', '**/dev-dist/**', '**/coverage/**']),

  ...pluginVue.configs['flat/recommended'],
  // Type-aware rules (floating/misused promises, no-op assertions, unsafe any …).
  vueTsConfigs.recommendedTypeChecked,

  {
    ...pluginVitest.configs.recommended,
    files: ['src/**/__tests__/*'],
  },

  {
    name: 'app/rules',
    rules: {
      // Formatting is handled by .editorconfig; keep lint focused on correctness.
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/html-indent': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/multi-word-component-names': 'off',

      // False positives for unconstrained generics (`S | null`) and component instance types.
      '@typescript-eslint/no-redundant-type-constituents': 'off',

      // Every switch over a union handles all members (or has a default).
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { considerDefaultExhaustiveForUnions: true },
      ],
      // `as` only where needed; object literals are typed with `satisfies` or annotations.
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'as', objectLiteralTypeAssertions: 'allow-as-parameter' },
      ],
    },
  },

  {
    name: 'app/test-rules',
    files: ['src/**/__tests__/*', 'e2e/**'],
    rules: {
      // Tests build partial fixtures and pass spies/methods around on purpose.
      '@typescript-eslint/consistent-type-assertions': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },

  {
    name: 'app/vue-generics',
    files: ['**/*.vue'],
    rules: {
      // typescript-eslint misreads `<script setup generic="…">` type parameters and reports
      // needed assertions as unnecessary (vue-tsc checks them).
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    },
  },
)
