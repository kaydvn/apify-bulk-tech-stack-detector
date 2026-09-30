import { Actor, log } from 'apify';
import { detect, extractSignals, parseSetCookies, summarize } from './detect.js';
import { loadFingerprints } from './fingerprints.js';

const EVENT = 'site';
const UA = 'Mozilla/5.0 (compatible; tech-stack-detector/1.0; Apify actor; +https://apify.com/mmaker-bot)';

function normalizeUrl(raw) {
    let s = String(raw || '').trim();
    if (!s) return null;
    if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
    try {
        const u = new URL(s);
        return u.hostname.includes('.') ? u.href : null;
    } catch {
        return null;
    }
}

async function fetchPage(url, timeoutMs) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(url, { redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': UA, accept: 'text/html,*/*;q=0.8' } });
        const buf = await res.arrayBuffer();
        const headers = Object.fromEntries(res.headers.entries());
        return { status: res.status, finalUrl: res.url || url, headers, cookies: parseSetCookies(res.headers.getSetCookie?.() || []), html: Buffer.from(buf.slice(0, 3_000_000)).toString('utf8') };
    } catch (err) {
        return { status: 0, finalUrl: url, error: err.name === 'AbortError' ? 'timeout' : err.message };
    } finally {
        clearTimeout(t);
    }
}

await Actor.init();
const input = (await Actor.getInput()) || {};
const { technologies, categories, commit } = loadFingerprints();
log.info(`Loaded ${Object.keys(technologies).length} technology fingerprints (webappanalyzer ${commit.slice(0, 7)})`);

const seen = new Set();
const urls = [];
for (const r of [...(input.urls || []), ...(input.startUrls || []).map((s) => (typeof s === 'string' ? s : s?.url))]) {
    const u = normalizeUrl(r);
    if (!u || seen.has(u)) continue;
    seen.add(u);
    urls.push(u);
}
if (!urls.length) throw new Error('Give at least one website URL or domain in "urls".');

const timeoutMs = Math.min(Math.max(Number(input.timeoutSecs) || 20, 3), 60) * 1000;
const concurrency = Math.min(Math.max(Number(input.concurrency) || 10, 1), 50);
const includeDetails = input.includeDetails !== false;
let done = 0;
let hits = 0;
let next = 0;
let limitReached = false;

async function worker() {
    while (next < urls.length && !limitReached) {
        const url = urls[next++];
        const page = await fetchPage(url, timeoutMs);
        done++;
        const domain = new URL(page.finalUrl).hostname.replace(/^www\./, '');
        if (page.error || !page.html) {
            if (input.includeFailed) await Actor.pushData({ url, domain, error: page.error || `HTTP ${page.status}`, technologyCount: 0 });
            continue;
        }
        const techs = detect(extractSignals({ url: page.finalUrl, html: page.html, headers: page.headers, cookies: page.cookies }), technologies, categories);
        const row = {
            url,
            finalUrl: page.finalUrl,
            domain,
            httpStatus: page.status,
            technologyCount: techs.length,
            technologyNames: techs.map((t) => t.name),
            ...summarize(techs),
            technologies: includeDetails ? techs : undefined,
        };
        if (techs.length) {
            hits++;
            // Charge only for websites where at least one technology was detected.
            const charge = await Actor.pushData(row, EVENT);
            if (charge?.eventChargeLimitReached) limitReached = true;
        } else if (input.includeFailed) {
            await Actor.pushData(row);
        }
        if (done % 10 === 0) await Actor.setStatusMessage(`Analyzed ${done}/${urls.length} websites`);
    }
}
await Promise.all(Array.from({ length: concurrency }, worker));

if (limitReached) log.info('Stopped at the maximum charge set for this run.');
await Actor.setStatusMessage(`Finished: technologies found on ${hits} of ${done} websites`, { isStatusMessageTerminal: true });
await Actor.exit();
