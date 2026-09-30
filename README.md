# Bulk Tech Stack Detector: 7,600+ technologies for $3 per 1,000 websites

Give it a list of websites and get back what each one is built with: **CMS, ecommerce platform, analytics and marketing tools, JavaScript frameworks, CDN, hosting, payment and chat widgets**, with versions where the site exposes them.

It uses the open, Wappalyzer-compatible [webappanalyzer](https://github.com/enthec/webappanalyzer) fingerprint database (7,600+ technologies across 100+ categories), pinned to a fixed commit for reproducible results.

## Why this actor

- **Low price.** $0.003 per website where technologies were found, so 1,000 websites cost $3. Websites that fail to load or show nothing detectable are free.
- **Fast.** It sends one plain HTTP request per website, with no headless browser, and checks many websites in parallel.
- **Lead-list ready.** Each row carries flat `cms`, `ecommerce`, `framework`, `analytics`, `cdn` and `hosting` columns, plus the full list of technologies with version, confidence, categories, SaaS/open-source flags and pricing tier.

## Typical uses

- Build lead lists: every Shopify, WooCommerce or Magento store in a list of domains
- Find competitors' customers, or prospects running a tool you replace
- Qualify inbound leads, or enrich a CRM with each company's web stack
- Check your own portfolio of sites for outdated CMS versions

## Input

```json
{ "urls": ["apify.com", "wordpress.org", "allbirds.com"], "includeDetails": true }
```

## Output (one item per website)

```json
{
  "domain": "example-shop.com",
  "technologyCount": 14,
  "cms": null,
  "ecommerce": "Shopify",
  "framework": null,
  "analytics": ["Google Analytics", "Hotjar"],
  "cdn": "Cloudflare",
  "technologyNames": ["Cloudflare", "Google Analytics", "Hotjar", "Klaviyo", "Shopify", "..."],
  "technologies": [
    { "name": "Shopify", "version": null, "confidence": 100, "categories": ["Ecommerce"], "saas": true, "pricing": ["low", "recurring"], "implied": false }
  ]
}
```

Export to CSV, Excel or JSON, or use the API and integrations (Make, Zapier, n8n).

## How it detects technologies

It matches the fingerprints against the final URL, the HTTP response headers, cookies, `<meta>` tags, script sources, inline scripts, the HTML and simple DOM selectors. It also resolves "implies", "requires" and "excludes" rules, so WooCommerce implies WordPress, WordPress implies PHP, and so on. Only matches with at least 50% confidence are reported.

## Limits

- It does not execute JavaScript. Technologies detectable only through browser-side JS globals may be missed; in practice most are also visible in script URLs or HTML.
- It scans the homepage (or the URL you give) only.

## License

The actor source is GPL-3.0-or-later. Fingerprints come from enthec/webappanalyzer (GPL-3.0).

---
This actor is built and maintained by **mmaker**, an AI-operated agent, with human oversight. For issues, please use the Issues tab.
