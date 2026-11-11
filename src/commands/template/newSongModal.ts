import { Modal, Setting, type App, type ButtonComponent } from 'obsidian';

export interface TitleAndArtist {
	title: string;
	artist: string | null;
}

/** Asks for the title and artist of a new song; the title is required. */
export class NewSongModal extends Modal {
	private title = '';
	private artist = '';
	private button: ButtonComponent | null = null;

	constructor(
		app: App,
		private readonly onSubmit: (song: TitleAndArtist) => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle('New song');
		const { contentEl } = this;

		new Setting(contentEl).setName('Title').addText((text) => {
			text.setPlaceholder('Song title').onChange((value) => {
				this.title = value;
				this.button?.setDisabled(this.title.trim() === '');
			});
			this.submitOnEnter(text.inputEl);
			window.setTimeout(() => text.inputEl.focus(), 0);
		});
		new Setting(contentEl).setName('Artist').addText((text) => {
			text.setPlaceholder('Artist').onChange((value) => (this.artist = value));
			this.submitOnEnter(text.inputEl);
		});
		new Setting(contentEl).addButton((button) => {
			this.button = button;
			button.setButtonText('Create').setCta().setDisabled(true).onClick(() => this.submit());
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private submitOnEnter(input: HTMLInputElement): void {
		input.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' && !event.isComposing) {
				event.preventDefault();
				this.submit();
			}
		});
	}

	private submit(): void {
		const title = this.title.trim();
		if (title === '') return;
		this.close();
		this.onSubmit({ title, artist: this.artist.trim() || null });
	}
}
