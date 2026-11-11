import { debounce, Modal, Setting, type App, type ButtonComponent, type TextComponent } from 'obsidian';
import { parseSong } from '../../parser';
import { importSong, type ImportedSong } from './convert';

/**
 * "Import song from clipboard" (R11): a paste box filled from the clipboard, the title and artist
 * found (editable), and a summary of what will be imported, updated as the text changes.
 * The clipboard cannot always be read (on Android it may be refused), so the box can be pasted
 * into by hand.
 */
export class ImportModal extends Modal {
	private song: ImportedSong | null = null;
	private title = '';
	private artist = '';
	/** Fields you typed in keep your text when the paste changes. */
	private titleEdited = false;
	private artistEdited = false;

	private paste!: HTMLTextAreaElement;
	private titleField!: TextComponent;
	private artistField!: TextComponent;
	private summaryEl!: HTMLElement;
	private button: ButtonComponent | null = null;

	constructor(
		app: App,
		private readonly onSubmit: (song: ImportedSong, title: string, artist: string | null) => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle('Import song');
		this.modalEl.addClass('songfolio-import-modal');
		const { contentEl } = this;

		contentEl.createEl('p', {
			cls: 'setting-item-description',
			text: 'Paste a song copied from a chord site: chords over lyrics, with any tab.',
		});
		this.paste = contentEl.createEl('textarea', {
			cls: 'songfolio-import-paste',
			attr: { placeholder: 'Paste the song here', spellcheck: 'false', rows: '10' },
		});
		const update = debounce(() => this.update(), 200, true);
		this.paste.addEventListener('input', update);

		new Setting(contentEl).setName('Title').addText((text) => {
			this.titleField = text;
			text.setPlaceholder('Song title').onChange((value) => {
				this.title = value;
				this.titleEdited = true;
				this.updateButton();
			});
		});
		new Setting(contentEl).setName('Artist').addText((text) => {
			this.artistField = text;
			text.setPlaceholder('Artist').onChange((value) => {
				this.artist = value;
				this.artistEdited = true;
			});
		});

		this.summaryEl = contentEl.createDiv({ cls: 'songfolio-import-summary' });
		new Setting(contentEl).addButton((button) => {
			this.button = button;
			button.setButtonText('Import').setCta().setDisabled(true).onClick(() => this.submit());
		});

		this.update();
		void this.readClipboard();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	/** Fills the paste box from the clipboard, if it can be read and the box is still empty. */
	private async readClipboard(): Promise<void> {
		let text = '';
		try {
			text = await navigator.clipboard.readText();
		} catch {
			// Refused or not available: the box stays empty to paste into.
		}
		if (text.trim() !== '' && this.paste.value.trim() === '') {
			this.paste.value = text;
			this.update();
		} else {
			this.paste.focus();
		}
	}

	private update(): void {
		const text = this.paste.value;
		this.song = text.trim() === '' ? null : importSong(text);
		if (!this.titleEdited) {
			this.title = this.song?.title ?? '';
			this.titleField.setValue(this.title);
		}
		if (!this.artistEdited) {
			this.artist = this.song?.artist ?? '';
			this.artistField.setValue(this.artist);
		}
		this.renderSummary();
		this.updateButton();
	}

	private renderSummary(): void {
		this.summaryEl.empty();
		const song = this.song;
		if (!song) return;
		const parsed = parseSong(song.body);
		const items = parsed.sections.flatMap((section) => section.items);
		const named = parsed.sections.filter((section) => section.name !== null).length;
		const tabs = items.filter((item) => item.kind === 'ascii').length;
		const parts = [
			song.key ? `Key ${song.key}` : null,
			song.capo ? `Capo ${song.capo}` : null,
			song.tuning ? `Tuning ${song.tuning}` : null,
			plural(named, 'section'),
			plural(tabs, 'tab'),
			parsed.errors.length > 0 ? plural(parsed.errors.length, 'error') : null,
		].filter((part): part is string => part !== null);
		this.summaryEl.setText(parts.join(' · '));
		this.summaryEl.toggleClass('mod-warning', parsed.errors.length > 0);
	}

	private updateButton(): void {
		this.button?.setDisabled(!this.song || this.title.trim() === '');
	}

	private submit(): void {
		const title = this.title.trim();
		if (!this.song || title === '') return;
		this.close();
		this.onSubmit(this.song, title, this.artist.trim() || null);
	}
}

function plural(count: number, word: string): string {
	return `${count} ${word}${count === 1 ? '' : 's'}`;
}
