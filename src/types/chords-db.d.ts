// Only the guitar data is bundled. Typed here with the fork's own types, so TypeScript does not
// infer a type from the 377 KB JSON file.
declare module '@tombatossals/chords-db/lib/guitar.json' {
	import type { InstrumentChords } from '@tombatossals/chords-db';

	const guitar: InstrumentChords;
	export default guitar;
}
