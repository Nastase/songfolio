import obsidianmd from 'eslint-plugin-obsidianmd';
import globals from 'globals';
import { globalIgnores, defineConfig } from 'eslint/config';

export default defineConfig(
	globalIgnores([
		'node_modules',
		'dist',
		'coverage',
		'dev-vault',
		'docs',
		'scripts',
		'esbuild.config.mjs',
		'version-bump.mjs',
		'versions.json',
		'main.js',
		'package.json',
		'package-lock.json',
		'tsconfig.json',
	]),
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: ['eslint.config.mts', 'manifest.json'],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json'],
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		// The parser, model and layout are pure TypeScript so Vitest can test them without Obsidian.
		files: ['src/parser/**/*.ts', 'src/model/**/*.ts', 'src/render/**/layout.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: 'obsidian',
							message:
								'The parser, model and layout must not depend on Obsidian.',
						},
					],
				},
			],
		},
	},
	{
		// Command logic is pure too; only the command wiring, note writing and dialogs use Obsidian.
		files: ['src/commands/**/*.ts'],
		ignores: [
			'src/commands/**/index.ts',
			'src/commands/**/*Modal.ts',
			'src/commands/note.ts',
			'src/commands/propertyTypes.ts',
		],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: 'obsidian',
							message:
								'Command logic must not depend on Obsidian; keep Obsidian calls in index.ts, note.ts or a *Modal.ts.',
						},
					],
				},
			],
		},
	},
	{
		// Tests run in Node under Vitest, never inside Obsidian.
		files: ['test/**/*.ts', 'vitest.config.ts'],
		languageOptions: { globals: { ...globals.node } },
		rules: {
			'obsidianmd/no-nodejs-modules': 'off',
		},
	},
);
