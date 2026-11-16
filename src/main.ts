import { Plugin } from 'obsidian';
import { registerConvertTabCommand, registerImportCommand } from './commands/import';
import { registerScrollCommand } from './commands/scroll';
import { registerTemplateCommands } from './commands/template';
import { registerTransposeCommands } from './commands/transpose';
import { SongSuggest } from './editor/suggest';
import { waitForExport } from './print';
import { SongBlock } from './render';
import { AutoScroller } from './render/scroll';
import { removeAddedStyles } from './render/tab/alphatab';
import {
	DEFAULT_SETTINGS,
	SongfolioSettings,
	SongfolioSettingTab,
} from './settings';

export default class SongfolioPlugin extends Plugin {
	declare settings: SongfolioSettings;
	/** Songsheet blocks on screen, so settings changes reach them. */
	readonly blocks = new Set<SongBlock>();
	/** Autoscroll, one song at a time. */
	readonly scroller = new AutoScroller(() => this.settings.autoscrollSpeed);

	async onload() {
		await this.loadSettings();

		this.registerMarkdownCodeBlockProcessor(
			this.settings.blockName,
			(source, el, ctx) => {
				const block = new SongBlock(el, this, source, ctx);
				ctx.addChild(block);
				// "Export to PDF" waits for a returned promise; on screen, nothing waits.
				return block.printing ? waitForExport(block.ready, el.win) : undefined;
			},
		);

		registerTemplateCommands(this);
		registerImportCommand(this);
		registerConvertTabCommand(this);
		registerTransposeCommands(this);
		registerScrollCommand(this);
		this.registerEditorSuggest(new SongSuggest(this.app, () => this.settings.blockName));
		this.addSettingTab(new SongfolioSettingTab(this.app, this));
	}

	onunload() {
		this.scroller.stop();
		removeAddedStyles();
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
