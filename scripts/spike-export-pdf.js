(() => {
	// Spike S2 export driver. Expects window.__s2opts = { out, pageSize, landscape, margin, downscale }.
	const o = window.__s2opts;
	const electron = require('electron');
	const dialog = electron.remote.dialog;
	const origDialog = dialog.showSaveDialog;
	const origOpen = window.open;
	const state = { status: 'started', startedAt: Date.now(), out: o.out };
	window.__s2 = state;
	const restore = () => {
		dialog.showSaveDialog = origDialog;
		window.open = origOpen;
	};
	dialog.showSaveDialog = async () => ({ canceled: false, filePath: o.out });
	// The print popup has its own Node context and ipcRenderer: patch that one so the
	// PDF is not opened in the system viewer, and time the print.
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
		includeName: false,
		pageSize: o.pageSize ?? 'A4',
		landscape: o.landscape ?? false,
		margin: o.margin ?? '0',
		downscalePercent: o.downscale ?? 100,
	});
	const view = app.workspace.activeLeaf.view;
	state.file = view.file?.path;
	view.printToPdf();
	setTimeout(() => {
		const btn = document.querySelector('.modal-container .modal button.mod-cta');
		state.clicked = !!btn;
		btn?.click();
	}, 300);
	return 'export started for ' + state.file;
})()
