// Technology detection from HTTP-only signals, using the open webappanalyzer
// fingerprint format (https://github.com/enthec/webappanalyzer, GPL-3.0).
// Pure functions: no network access here.

const reCache = new Map();

// "regex\;version:\1\;confidence:50" -> { re, version, confidence }
export function parsePattern(str) {
    if (reCache.has(str)) return reCache.get(str);
    const parts = String(str).split('\\;');
    const out = { re: null, version: null, confidence: 100 };
    for (const tag of parts.slice(1)) {
        const i = tag.indexOf(':');
        if (i < 0) continue;
        const k = tag.slice(0, i);
        const v = tag.slice(i + 1);
        if (k === 'version') out.version = v;
        else if (k === 'confidence') out.confidence = Number(v) || 0;
    }
    try {
        // Fingerprints use JS-compatible regexes; limit backtracking risk by capping input length at call sites.
        out.re = new RegExp(parts[0].replace(/\//g, '\\/'), 'i');
    } catch {
        out.re = null;
    }
    reCache.set(str, out);
    return out;
}

export function resolveVersion(template, match) {
    if (!template || !match) return null;
    let v = template.replace(/\\(\d)/g, (_, n) => match[Number(n)] ?? '');
    // Ternary syntax: \1?a:b
    v = v.replace(/^(.*)\?(.*):(.*)$/, (_, cond, a, b) => (cond ? a : b));
    v = v.trim();
    return v && v.length <= 20 ? v : null;
}

const toArray = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

function testOne(pattern, value) {
    const p = parsePattern(pattern);
    if (!p.re || value == null) return null;
    const m = p.re.exec(String(value).slice(0, 200_000));
    if (!m) return null;
    return { confidence: p.confidence, version: resolveVersion(p.version, m) };
}

// Collect page signals once so every fingerprint can be tested cheaply.
export function extractSignals({ url, html = '', headers = {}, cookies = {} }) {
    const h = String(html).slice(0, 2_000_000);
    const scriptSrc = [];
    const scripts = [];
    const meta = {};
    for (const m of h.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        const src = m[1].match(/\bsrc\s*=\s*["']?([^"'\s>]+)/i);
        if (src) scriptSrc.push(src[1]);
        else if (m[2].trim()) scripts.push(m[2].slice(0, 50_000));
    }
    for (const m of h.matchAll(/<meta\b[^>]*>/gi)) {
        const tag = m[0];
        const name = tag.match(/\b(?:name|property|http-equiv)\s*=\s*["']([^"']+)["']/i)?.[1];
        const content = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1];
        if (name && content != null) meta[name.toLowerCase()] = content;
    }
    const lowerHeaders = {};
    for (const [k, v] of Object.entries(headers)) lowerHeaders[k.toLowerCase()] = String(v);
    const text = h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 200_000);
    return { url, html: h, headers: lowerHeaders, cookies, scriptSrc, scripts: scripts.join('\n'), meta, text };
}

// Minimal DOM selector support: tag[attr], tag[attr='v'], tag[attr*='v'], tag[attr^='v'], tag[attr$='v'], chained;
// no combinators. Returns true if some tag in html matches.
function domSelectorMatches(selector, html) {
    const sel = selector.trim().replace(/\\:/g, ':');
    if (/[\s>+~,:]/.test(sel.replace(/\[[^\]]*\]/g, ''))) return false;
    const m = sel.match(/^([a-z0-9-]*)((?:\[[^\]]+\])*)$/i);
    if (!m) return false;
    const tag = m[1] || '[a-z0-9-]+';
    const conds = [...m[2].matchAll(/\[\s*([a-z0-9_:-]+)\s*(?:([*^$~]?=)\s*["']?([^"'\]]*)["']?)?\s*\]/gi)];
    if ((!conds.length && !m[1]) || conds.length !== (m[2].match(/\[/g) || []).length) return false;
    const tagRe = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
    for (const t of html.matchAll(tagRe)) {
        const s = t[0];
        const ok = conds.every(([, attr, op, val]) => {
            const a = s.match(new RegExp(`\\s${attr.replace(/[-:]/g, '\\$&')}\\s*(?:=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+)))?`, 'i'));
            if (!a) return false;
            if (!op) return true;
            const got = a[2] ?? a[3] ?? a[4] ?? '';
            if (op === '=') return got === val;
            if (op === '*=') return got.includes(val);
            if (op === '^=') return got.startsWith(val);
            if (op === '$=') return got.endsWith(val);
            if (op === '~=') return got.split(/\s+/).includes(val);
            return false;
        });
        if (ok) return true;
    }
    return false;
}

function matchTech(fp, s) {
    const hits = [];
    const add = (r) => r && hits.push(r);
    for (const p of toArray(fp.url)) add(testOne(p, s.url));
    for (const p of toArray(fp.html)) add(testOne(p, s.html));
    for (const p of toArray(fp.text)) add(testOne(p, s.text));
    for (const p of toArray(fp.scripts)) add(testOne(p, s.scripts));
    for (const p of toArray(fp.scriptSrc)) for (const src of s.scriptSrc) add(testOne(p, src));
    for (const [k, p] of Object.entries(fp.headers || {})) {
        const v = s.headers[k.toLowerCase()];
        if (v != null) add(testOne(p, v));
    }
    for (const [k, p] of Object.entries(fp.cookies || {})) {
        const v = s.cookies[k] ?? s.cookies[k.toLowerCase()];
        if (v != null) add(testOne(p, v));
    }
    for (const [k, p] of Object.entries(fp.meta || {})) {
        const v = s.meta[k.toLowerCase()];
        if (v != null) for (const pp of toArray(p)) add(testOne(pp, v));
    }
    const dom = fp.dom;
    if (typeof dom === 'string' || Array.isArray(dom)) {
        for (const sel of toArray(dom)) if (domSelectorMatches(sel, s.html)) hits.push({ confidence: 100, version: null });
    } else if (dom && typeof dom === 'object') {
        for (const [sel, spec] of Object.entries(dom)) {
            if (spec && Object.keys(spec).every((k) => k === 'exists') && domSelectorMatches(sel, s.html)) hits.push({ confidence: 100, version: null });
        }
    }
    if (!hits.length) return null;
    const confidence = Math.min(100, hits.reduce((a, h) => a + h.confidence, 0));
    const version = hits.map((h) => h.version).filter(Boolean).sort((a, b) => b.length - a.length)[0] || null;
    return { confidence, version };
}

// technologies: { name: fingerprint }, categories: { id: { name } }
export function detect(signals, technologies, categories = {}) {
    const found = new Map();
    for (const [name, fp] of Object.entries(technologies)) {
        const r = matchTech(fp, signals);
        if (r) found.set(name, { ...r, implied: false });
    }
    // requires: only keep if the required tech was detected.
    for (const [name] of found) {
        const req = toArray(technologies[name].requires);
        if (req.length && !req.some((r) => found.has(r))) found.delete(name);
        const reqCat = toArray(technologies[name].requiresCategory);
        if (reqCat.length && ![...found.keys()].some((n) => n !== name && toArray(technologies[n]?.cats).some((c) => reqCat.includes(c)))) found.delete(name);
    }
    // implies, transitively.
    const queue = [...found.keys()];
    while (queue.length) {
        const name = queue.shift();
        for (const imp of toArray(technologies[name]?.implies)) {
            const p = parsePattern(imp);
            const impName = String(imp).split('\\;')[0];
            if (!technologies[impName] || found.has(impName)) continue;
            found.set(impName, { confidence: p.confidence, version: null, implied: true });
            queue.push(impName);
        }
    }
    for (const [name] of [...found]) for (const ex of toArray(technologies[name]?.excludes)) found.delete(ex);
    return [...found]
        .filter(([, r]) => r.confidence >= 50)
        .map(([name, r]) => {
            const fp = technologies[name];
            return {
                name,
                version: r.version,
                confidence: r.confidence,
                categories: toArray(fp.cats).map((c) => categories[c]?.name).filter(Boolean),
                website: fp.website || null,
                saas: fp.saas ?? null,
                oss: fp.oss ?? null,
                pricing: fp.pricing || [],
                implied: r.implied,
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
}

export function parseSetCookies(list) {
    const out = {};
    for (const c of list || []) {
        const m = String(c).match(/^\s*([^=;\s]+)\s*=\s*([^;]*)/);
        if (m) out[m[1]] = m[2];
    }
    return out;
}

export function summarize(techs) {
    const byCategory = {};
    for (const t of techs) for (const c of t.categories.length ? t.categories : ['Other']) (byCategory[c] ||= []).push(t.name);
    const pick = (...cats) => cats.flatMap((c) => byCategory[c] || [])[0] || null;
    return {
        cms: pick('CMS', 'Blogs'),
        ecommerce: pick('Ecommerce'),
        framework: pick('JavaScript frameworks', 'Web frameworks', 'Static site generator'),
        analytics: byCategory.Analytics || [],
        cdn: pick('CDN'),
        hosting: pick('PaaS', 'Hosting', 'IaaS'),
        technologiesByCategory: byCategory,
    };
}
