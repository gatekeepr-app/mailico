import tsParser from '@typescript-eslint/parser'

export default [
  {
    ignores: ['public/sw.js', 'convex/_generated/**']
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off'
    }
  }
]
