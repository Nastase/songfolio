// Checks that a release tag matches the version in manifest.json and package.json, and that
// versions.json maps it to the manifest's minAppVersion. Run by the release workflow.
// Usage: node scripts/check-release.mjs <tag>
import { readFileSync } from 'node:fs';

const tag = process.argv[2];
if (!tag) {
	console.error('Usage: node scripts/check-release.mjs <tag>');
	process.exit(1);
}

const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const manifest = read('manifest.json');
const pkg = read('package.json');
const versions = read('versions.json');

const problems = [];
if (manifest.version !== tag) problems.push(`manifest.json has version ${manifest.version}`);
if (pkg.version !== tag) problems.push(`package.json has version ${pkg.version}`);
if (versions[tag] !== manifest.minAppVersion) {
	problems.push(`versions.json maps it to ${versions[tag]}, not to minAppVersion ${manifest.minAppVersion}`);
}

if (problems.length > 0) {
	console.error(`Tag ${tag} does not match the release files: ${problems.join('; ')}.`);
	process.exit(1);
}
console.log(`Tag ${tag} matches manifest.json, package.json and versions.json.`);
