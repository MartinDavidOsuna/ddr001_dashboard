import js from '@eslint/js'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'figma/**', 'src/**/*.vue.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  { languageOptions: { globals: { ...globals.browser, __PLATFORM_VERSION__: 'readonly', __BUILD_COMMIT__: 'readonly', __BUILD_DATE__: 'readonly' } }, rules: { 'vue/multi-word-component-names': 'off', '@typescript-eslint/no-explicit-any': 'off' } },
  { files: ['src/**/*.vue'], languageOptions: { parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'] } } },
  { files: ['scripts/**/*.mjs','vite.config.ts'], languageOptions: { globals: globals.node } },
)
