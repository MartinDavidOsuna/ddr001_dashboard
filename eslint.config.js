import js from '@eslint/js'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'figma/**', 'src/**/*.vue', 'src/**/*.vue.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  { languageOptions: { globals: globals.browser }, rules: { 'vue/multi-word-component-names': 'off', '@typescript-eslint/no-explicit-any': 'off' } },
  { files: ['scripts/**/*.mjs'], languageOptions: { globals: globals.node } },
)
