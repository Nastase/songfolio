/** Font files are inlined by esbuild as base64 strings (see `loader` in esbuild.config.mjs). */
declare module '*.woff2' {
	const base64: string;
	export default base64;
}
