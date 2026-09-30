// Downloads the open webappanalyzer fingerprints (GPL-3.0) at a pinned commit into ./data at build time.
import { mkdir, writeFile } from 'node:fs/promises';

const COMMIT = 'eea872af449e207e055398f7369d11ee48c8ea03';
const BASE = `https://raw.githubusercontent.com/enthec/webappanalyzer/${COMMIT}/src`;
const files = ['categories.json', ...'_abcdefghijklmnopqrstuvwxyz'.split('').map((c) => `technologies/${c}.json`)];

await mkdir('data', { recursive: true });
const technologies = {};
let categories = {};
for (const f of files) {
    const res = await fetch(`${BASE}/${f}`);
    if (!res.ok) throw new Error(`${f}: HTTP ${res.status}`);
    const json = await res.json();
    if (f === 'categories.json') categories = json;
    else Object.assign(technologies, json);
}
await writeFile('data/fingerprints.json', JSON.stringify({ commit: COMMIT, categories, technologies }));
console.log(`Saved ${Object.keys(technologies).length} technologies`);
