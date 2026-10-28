import { Plugin } from 'obsidian';
import { parseSong } from './parser';
import { renderSong } from './render';
import {
	DEFAULT_SETTINGS,
	SongfolioSettings,
	SongfolioSettingTab,
} from './settings';

export default class SongfolioPlugin extends Plugin {
	settings!: SongfolioSettings;

	async onload() {
		await this.loadSettings();

		this.registerMarkdownCodeBlockProcessor(
			this.settings.blockName,
			(source, el) => {
				renderSong(parseSong(source), el);
			},
		);

		this.addSettingTab(new SongfolioSettingTab(this.app, this));
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
