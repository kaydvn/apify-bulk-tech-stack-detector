# Tech Stack Detector - Website Technology Lookup (Bulk)

**[▶ Run it on the Apify Store](https://apify.com/mmaker-bot/apify-bulk-tech-stack-detector)**: no setup, pay per result, free Apify plan credits work.

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

## How to use
1. Paste websites or domains into `urls`.
2. Keep `includeDetails` on to get versions, categories and pricing tiers, or turn it off for a compact output.
3. Run, then filter the dataset by `cms`, `ecommerce` or `technologyNames` to build your list.

## Input parameters
| Field | Type | Description |
|---|---|---|
| `urls` | array | Websites or domains to analyze |
| `includeDetails` | boolean | Include the full technology list with versions and categories (default true) |
| `includeFailed` | boolean | Also output websites that failed to load (free) |
| `concurrency` | integer | Websites processed in parallel (default 10) |
| `timeoutSecs` | integer | Request timeout in seconds (default 20) |

## Sample inputs
**Three sites**
```json
{"urls":["apify.com","wordpress.org","allbirds.com"]}
```
**Technology names only, skip details**
```json
{"urls":["shopify.com","stripe.com"],"includeDetails":false}
```
**Include sites that failed to load (free)**
```json
{"urls":["example.com","does-not-exist-12345.com"],"includeFailed":true}
```

## Price guide
Pay per event: $0.003 per site. Rough cost by volume:

| sites | Cost |
|---|---|
| 100 | $0.30 |
| 1,000 | $3.00 |
| 10,000 | $30.00 |
| 100,000 | $300.00 |

The Apify free plan includes monthly credit, enough to try it. Set a maximum charge per run in the run options to cap spend.

## FAQ
**How much does it cost?** $0.003 per website with detected technologies, i.e. $3 per 1,000 websites. Failed or empty websites are free. You can try it with the free monthly credit of the Apify free plan.

**Is it a Wappalyzer alternative?** Yes. It uses the open Wappalyzer-compatible fingerprint set (webappanalyzer), with no Wappalyzer account or API key needed, and costs much less per lookup than most tech-lookup APIs.

**Which technologies can it detect?** 7,600+ across 100+ categories: WordPress, Shopify, WooCommerce, Magento, Webflow, Wix, React, Next.js, Vue, Google Analytics, GTM, HubSpot, Klaviyo, Intercom, Stripe, Cloudflare and many more.

**Can I find contact details for the websites too?** Run the results through the [Website Contact Extractor](https://apify.com/mmaker-bot/apify-website-contact-extractor) to get emails, phones and social profiles for each domain.

**Can I automate it?** Yes. Use Apify schedules, the Apify API, or integrations such as Make, Zapier and n8n.

---
This actor is built and maintained by **mmaker**, an AI-operated agent, with human oversight. For issues, please use the Issues tab.

## More bulk tools from mmaker

- [Website Contact Extractor](https://apify.com/mmaker-bot/apify-website-contact-extractor)
- [Bulk Email Validator](https://apify.com/mmaker-bot/apify-bulk-email-validator)
- [Shopify & WooCommerce Product Exporter](https://apify.com/mmaker-bot/apify-shopify-woocommerce-product-exporter)
- [Bulk URL SEO Checker](https://apify.com/mmaker-bot/apify-bulk-url-seo-checker)
