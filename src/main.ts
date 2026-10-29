import { Plugin } from 'obsidian';
import { parseSong } from './parser';
import { renderSong } from './render';
import { s1log } from './render/tab/spike';
import {
	DEFAULT_SETTINGS,
	SongfolioSettings,
	SongfolioSettingTab,
} from './settings';

export default class SongfolioPlugin extends Plugin {
	settings!: SongfolioSettings;

	async onload() {
		const loadStart = performance.now();
		await this.loadSettings();

		this.registerMarkdownCodeBlockProcessor(
			this.settings.blockName,
			(source, el, ctx) => {
				const startedAt = performance.now();
				renderSong(parseSong(source), el, { app: this.app, ctx, startedAt });
			},
		);

		this.addSettingTab(new SongfolioSettingTab(this.app, this));
		s1log(`onload: ${Math.round(performance.now() - loadStart)} ms`);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<SongfolioSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
