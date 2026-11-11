import type { App } from 'obsidian';
import { PROPERTY_TYPES, type SongProperty } from './songNote';

/**
 * Obsidian's property type registry. Not in the public API (read from Obsidian 1.15), so every
 * use is guarded: when it is missing or changes shape, types are left to Obsidian's guess.
 */
interface MetadataTypeManager {
	getAssignedWidget(name: string): string | null;
	setType(name: string, widget: string): Promise<void>;
}

function typeManager(app: App): MetadataTypeManager | null {
	const manager = (app as unknown as { metadataTypeManager?: Partial<MetadataTypeManager> })
		.metadataTypeManager;
	if (typeof manager?.getAssignedWidget !== 'function' || typeof manager.setType !== 'function') return null;
	return manager as MetadataTypeManager;
}

/**
 * Gives the song properties, and the marker property, their type when they have none yet.
 * Obsidian guesses a type from the first value it sees, so an empty `started` would become text
 * and Bases would not sort it as a date. Types already set, by you or Obsidian, are kept.
 */
export async function assignPropertyTypes(app: App, markerName: string): Promise<void> {
	const manager = typeManager(app);
	if (!manager) return;
	const wanted: [string, string][] = [
		...(Object.entries(PROPERTY_TYPES) as [SongProperty, string][]),
		[markerName, 'text'],
	];
	for (const [name, widget] of wanted) {
		try {
			if (manager.getAssignedWidget(name) === null) await manager.setType(name, widget);
		} catch (error) {
			console.warn(`Songfolio: could not set the type of property ${name}`, error);
			return;
		}
	}
}
