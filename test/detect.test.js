import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detect, extractSignals, parsePattern, parseSetCookies, resolveVersion, summarize } from '../src/detect.js';

const CATS = { 1: { name: 'CMS' }, 6: { name: 'Ecommerce' }, 27: { name: 'Programming languages' }, 10: { name: 'Analytics' }, 34: { name: 'Databases' }, 22: { name: 'Web servers' } };
const TECH = {
    WordPress: {
        cats: [1],
        meta: { generator: '^WordPress(?: ([\\d.]+))?\\;version:\\1' },
        scriptSrc: ['/wp-(?:content|includes)/'],
        dom: ["link[rel=stylesheet][href*='/wp-content/']"],
        implies: ['PHP', 'MySQL'],
        website: 'https://wordpress.org',
    },
    PHP: { cats: [27], headers: { 'X-Powered-By': '^php/?([\\d.]+)?\\;version:\\1' } },
    MySQL: { cats: [34] },
    Shopify: { cats: [6], cookies: { _shopify_y: '' }, headers: { 'x-shopid': '\\;confidence:50' } },
    'Google Analytics': { cats: [10], scriptSrc: ['googletagmanager\\.com/gtag/js'], scripts: ['gtag\\('] },
    'Weak Signal': { cats: [10], html: ['weak-marker\\;confidence:25'] },
    Nginx: { cats: [22], headers: { Server: 'nginx(?:/([\\d.]+))?\\;version:\\1' } },
    'WooCommerce': { cats: [6], html: ['woocommerce'], requires: ['WordPress'] },
    'Needs Shopify': { cats: [6], html: ['needs-shopify'], requires: 'Shopify' },
};

const HTML = `<html><head><meta name="generator" content="WordPress 6.5.2">
<link rel="stylesheet" href="/wp-content/themes/x/style.css">
<script src="https://www.googletagmanager.com/gtag/js?id=G-1"></script>
<script>window.dataLayer=[];function gtag(){} gtag('js', new Date());</script>
</head><body class="woocommerce needs-shopify">weak-marker</body></html>`;

test('parsePattern and resolveVersion', () => {
    const p = parsePattern('nginx(?:/([\\d.]+))?\\;version:\\1\\;confidence:75');
    assert.equal(p.confidence, 75);
    assert.equal(resolveVersion(p.version, p.re.exec('nginx/1.25.3')), '1.25.3');
    assert.equal(resolveVersion('\\1?v2:v1', ['x', '']), 'v1');
    assert.equal(resolveVersion('\\1?v2:v1', ['x', 'y']), 'v2');
    assert.equal(parsePattern('([').re, null);
});

test('detects via meta, scriptSrc, scripts, headers, dom, implies', () => {
    const s = extractSignals({ url: 'https://shop.example/', html: HTML, headers: { Server: 'nginx/1.25.3', 'X-Powered-By': 'PHP/8.2.1' }, cookies: {} });
    const techs = detect(s, TECH, CATS);
    const by = Object.fromEntries(techs.map((t) => [t.name, t]));
    assert.equal(by.WordPress.version, '6.5.2');
    assert.deepEqual(by.WordPress.categories, ['CMS']);
    assert.equal(by.PHP.version, '8.2.1');
    assert.equal(by.PHP.implied, false);
    assert.equal(by.MySQL.implied, true);
    assert.equal(by.Nginx.version, '1.25.3');
    assert.ok(by['Google Analytics']);
    assert.ok(by.WooCommerce, 'requires satisfied');
    assert.ok(!by['Needs Shopify'], 'requires not satisfied');
    assert.ok(!by['Weak Signal'], 'below 50 confidence');
    assert.ok(!by.Shopify);
});

test('cookies and low-confidence headers add up', () => {
    const s = extractSignals({ url: 'https://x.example/', html: '<p>hi</p>', headers: { 'x-shopid': '123' }, cookies: parseSetCookies(['_shopify_y=abc; Path=/; Secure']) });
    const techs = detect(s, TECH, CATS);
    assert.deepEqual(techs.map((t) => t.name), ['Shopify']);
    assert.equal(techs[0].confidence, 100);
    const only = detect(extractSignals({ url: 'https://x.example/', html: '', headers: { 'x-shopid': '1' } }), TECH, CATS);
    assert.equal(only[0].confidence, 50);
});

test('summarize picks main categories', () => {
    const s = extractSignals({ url: 'https://shop.example/', html: HTML, headers: {} });
    const sum = summarize(detect(s, TECH, CATS));
    assert.equal(sum.cms, 'WordPress');
    assert.equal(sum.ecommerce, 'WooCommerce');
    assert.deepEqual(sum.analytics, ['Google Analytics']);
});

test('parseSetCookies', () => {
    assert.deepEqual(parseSetCookies(['a=1; Path=/', 'b=; HttpOnly']), { a: '1', b: '' });
});

test('escaped-colon DOM selectors do not match every html tag', () => {
    const t = { Pub: { cats: [1], dom: ["html[xmlns\\:w='urn:schemas-microsoft-com:office:publisher']"] } };
    assert.equal(detect(extractSignals({ url: 'https://a.b/', html: '<html lang="en"><body></body></html>' }), t, CATS).length, 0);
    assert.equal(detect(extractSignals({ url: 'https://a.b/', html: `<html xmlns:w='urn:schemas-microsoft-com:office:publisher'>` }), t, CATS).length, 1);
});
