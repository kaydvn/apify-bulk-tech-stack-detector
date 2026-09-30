import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// FINGERPRINT_DIR points at a local webappanalyzer checkout (src/) for development.
export function loadFingerprints() {
    const dir = process.env.FINGERPRINT_DIR;
    if (!dir) return JSON.parse(readFileSync(new URL('../data/fingerprints.json', import.meta.url), 'utf8'));
    const technologies = {};
    for (const c of '_abcdefghijklmnopqrstuvwxyz') Object.assign(technologies, JSON.parse(readFileSync(join(dir, 'technologies', `${c}.json`), 'utf8')));
    return { commit: 'local', categories: JSON.parse(readFileSync(join(dir, 'categories.json'), 'utf8')), technologies };
}
