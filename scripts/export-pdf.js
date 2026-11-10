(() => {
	// Runs Obsidian's own "Export to PDF" on the active note, without dialogs (see export-pdf.sh).
	// Expects window.__songfolioExportOpts = { out, pageSize, landscape, margin, downscale, includeName }.
	// Progress and the check of the export window go to window.__songfolioExport.
	const o = window.__songfolioExportOpts;
	const electron = require('electron');
	const dialog = electron.remote.dialog;
	const origDialog = dialog.showSaveDialog;
	const origOpen = window.open;
	const { config } = app.vault;
	const hadSettings = Object.prototype.hasOwnProperty.call(config, 'pdfExportSettings');
	const origSettings = hadSettings ? JSON.parse(JSON.stringify(config.pdfExportSettings)) : null;
	const state = { status: 'started', startedAt: Date.now(), out: o.out };
	window.__songfolioExport = state;

	// Leaves the vault's app.json as it was: the export dialog saves its options there.
	const restore = () => {
		dialog.showSaveDialog = origDialog;
		window.open = origOpen;
		if (hadSettings) app.vault.setConfig('pdfExportSettings', origSettings);
		else {
			delete config.pdfExportSettings;
			app.vault.requestSaveConfig();
		}
	};

	// What the PDF will show, read from the export window just before it prints. The window is
	// wider than the page, so each song is laid out at its text column while it is measured.
	const check = (doc) => {
		const roots = Array.from(doc.querySelectorAll('.print .songfolio'));
		const tabs = Array.from(doc.querySelectorAll('.print .songfolio-tab'));
		const drawn = tabs.filter((tab) => tab.querySelector('.at-surface svg'));
		const tabErrors = tabs.filter((tab) => tab.querySelector('.songfolio-tab-errors'));
		const wide = [];
		for (const root of roots) {
			const value = getComputedStyle(root).getPropertyValue('--songfolio-print-width').trim();
			const column = parseFloat(value) || 654;
			const width = root.style.width;
			root.style.width = `${column}px`;
			const right = root.getBoundingClientRect().right;
			const parts = root.querySelectorAll(
				'.songfolio-header, .songfolio-diagrams, .songfolio-line, .songfolio-ascii, .songfolio-strum, .songfolio-tab .at-surface',
			);
			for (const el of parts) {
				const over = Math.max(el.scrollWidth - el.clientWidth, el.getBoundingClientRect().right - right);
				if (over > 1) wide.push({ cls: el.className.toString().split(' ')[0], over: Math.round(over), column });
			}
			root.style.width = width;
		}
		return {
			songs: roots.length,
			tabs: tabs.length,
			tabsDrawn: drawn.length,
			tabsWithErrors: tabErrors.length,
			tabsPending: doc.querySelectorAll('.print .songfolio-tab-pending').length,
			wide,
		};
	};

	dialog.showSaveDialog = async () => ({ canceled: false, filePath: o.out });
	// The export window has its own Node context and ipcRenderer: patch that one, so the PDF is
	// not opened in the system viewer, and check the page when the print starts.
	window.open = function (...args) {
		const popup = origOpen.apply(this, args);
		window.open = origOpen;
		setTimeout(() => {
			const ipc = popup?.electron?.ipcRenderer;
			state.patched = !!ipc;
			if (!ipc) return;
			const send = ipc.send;
			ipc.send = function (channel, ...rest) {
				if (channel === 'print-to-pdf' && rest[0]) {
					rest[0].open = false;
					state.printAt = Date.now() - state.startedAt;
					try {
						state.check = check(popup.document);
					} catch (error) {
						state.check = { error: String(error) };
					}
					ipc.once('print-to-pdf', () => {
						state.status = 'done';
						state.doneAt = Date.now() - state.startedAt;
						restore();
					});
				}
				return send.call(this, channel, ...rest);
			};
		}, 0);
		return popup;
	};
	setTimeout(() => {
		if (state.status !== 'done') {
			state.status = 'timeout';
			restore();
		}
	}, 60000);

	app.vault.setConfig('pdfExportSettings', {
		includeName: o.includeName ?? false,
		pageSize: o.pageSize ?? 'A4',
		landscape: o.landscape ?? false,
		margin: o.margin ?? '0',
		downscalePercent: o.downscale ?? 100,
	});
	const view = app.workspace.activeLeaf.view;
	state.file = view.file?.path;
	view.printToPdf();
	setTimeout(() => {
		const button = document.querySelector('.modal-container .modal button.mod-cta');
		state.clicked = !!button;
		button?.click();
	}, 300);
	return 'export started for ' + state.file;
})();
