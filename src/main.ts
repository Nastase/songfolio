import { Plugin } from 'obsidian';
import { SongBlock } from './render';
import {
	DEFAULT_SETTINGS,
	SongfolioSettings,
	SongfolioSettingTab,
} from './settings';

export default class SongfolioPlugin extends Plugin {
	declare settings: SongfolioSettings;
	/** Songsheet blocks on screen, so settings changes reach them. */
	readonly blocks = new Set<SongBlock>();

	async onload() {
		await this.loadSettings();

		this.registerMarkdownCodeBlockProcessor(
			this.settings.blockName,
			(source, el, ctx) => {
				ctx.addChild(new SongBlock(el, this, source, ctx));
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

	/** Restyles the blocks on screen after a settings change. */
	applySettings() {
		for (const block of this.blocks) block.applySettings();
	}
}
