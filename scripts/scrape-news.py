
#!/usr/bin/env python3
"""
Indian Stock Market News Scraper

Scrapes news from Moneycontrol and Economic Times Markets,
then inserts into the market_news Supabase table.

Uses requests + BeautifulSoup (lightweight, no browser dependencies).
"""

import os
import re
import sys
import logging
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

# Load env vars from .env.local at the repo root
ENV_PATH = Path(__file__).resolve().parent.parent / ".env.local"
load_dotenv(dotenv_path=ENV_PATH)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    log.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local")
    sys.exit(1)

sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-IN,en;q=0.9",
}

# ---------------------------------------------------------------------------
# Category detection
# ---------------------------------------------------------------------------

CATEGORY_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("ipo", re.compile(r"\bipo\b|initial public offer", re.IGNORECASE)),
    ("mutual-funds", re.compile(r"\bmutual[\s\-]?fund", re.IGNORECASE)),
    ("crypto", re.compile(r"\bcrypto|bitcoin|ethereum|blockchain", re.IGNORECASE)),
    ("economy", re.compile(r"\bgdp\b|inflation|rbi|fiscal|monetary policy|economy|economic", re.IGNORECASE)),
    ("stocks", re.compile(r"\bshare price|stock tip|buy|sell|target price|multibagger|smallcap|midcap|largecap", re.IGNORECASE)),
    ("markets", re.compile(r"\bsensex|nifty|market|bse|nse|bull|bear|rally|correction", re.IGNORECASE)),
]


def categorize(text: str) -> str:
    for category, pattern in CATEGORY_PATTERNS:
        if pattern.search(text):
            return category
    return "general"


def fetch_page(url: str) -> BeautifulSoup | None:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        return BeautifulSoup(resp.text, "lxml")
    except Exception as exc:
        log.error("Failed to fetch %s: %s", url, exc)
        return None


# ---------------------------------------------------------------------------
# Moneycontrol scraper
# ---------------------------------------------------------------------------

def scrape_moneycontrol() -> list[dict]:
    url = "https://www.moneycontrol.com/news/business/markets/"
    log.info("Scraping Moneycontrol: %s", url)
    articles: list[dict] = []

    soup = fetch_page(url)
    if not soup:
        return articles

    # Moneycontrol lists articles in <li> with class 'clearfix'
    items = soup.select("#caget498 li.clearfix")
    if not items:
        items = soup.select("li.clearfix")

    log.info("Moneycontrol: found %d candidate items", len(items))

    for item in items:
        try:
            link_el = item.select_one("h2 a") or item.select_one("a")
            if not link_el:
                continue

            title = link_el.get_text(strip=True)
            href = (link_el.get("href") or "").strip()
            if not title or not href:
                continue

            if href.startswith("/"):
                href = "https://www.moneycontrol.com" + href

            # Skip non-article links
            if "/news/" not in href and "/article/" not in href:
                continue

            summary_el = item.select_one("p")
            summary = summary_el.get_text(strip=True) if summary_el else ""

            img_el = item.select_one("img")
            image_url = ""
            if img_el:
                image_url = (img_el.get("data-src") or img_el.get("src") or "").strip()

            articles.append({
                "title": title[:500],
                "summary": summary[:1000] or None,
                "url": href,
                "source": "moneycontrol",
                "category": categorize(title + " " + summary),
                "image_url": image_url or None,
                "published_at": datetime.now(timezone.utc).isoformat(),
            })
        except Exception as exc:
            log.warning("Moneycontrol: failed to parse item: %s", exc)

    log.info("Moneycontrol: scraped %d articles", len(articles))
    return articles


# ---------------------------------------------------------------------------
# Economic Times scraper
# ---------------------------------------------------------------------------

def scrape_economic_times() -> list[dict]:
    url = "https://economictimes.indiatimes.com/markets/stocks/news"
    log.info("Scraping Economic Times: %s", url)
    articles: list[dict] = []

    soup = fetch_page(url)
    if not soup:
        return articles

    # ET uses eachStory divs or story list items
    items = soup.select("div.eachStory")
    if not items:
        items = soup.select("div.story-box")
    if not items:
        # Broader: any link inside the main content that points to /markets/
        items = soup.select("div.clr")

    log.info("Economic Times: found %d candidate items", len(items))

    for item in items:
        try:
            link_el = item.select_one("a[href]")
            if not link_el:
                continue

            # Title from heading or link text
            h_el = item.select_one("h3") or item.select_one("h2") or item.select_one("h4")
            title = h_el.get_text(strip=True) if h_el else link_el.get_text(strip=True)
            href = (link_el.get("href") or "").strip()

            if not title or not href:
                continue

            if href.startswith("/"):
                href = "https://economictimes.indiatimes.com" + href

            # Skip non-article links
            if "/articleshow/" not in href and "/news/" not in href:
                continue

            summary_el = item.select_one("p")
            summary = summary_el.get_text(strip=True) if summary_el else ""

            img_el = item.select_one("img")
            image_url = ""
            if img_el:
                image_url = (img_el.get("data-src") or img_el.get("src") or "").strip()

            articles.append({
                "title": title[:500],
                "summary": summary[:1000] or None,
                "url": href,
                "source": "economic-times",
                "category": categorize(title + " " + summary),
                "image_url": image_url or None,
                "published_at": datetime.now(timezone.utc).isoformat(),
            })
        except Exception as exc:
            log.warning("Economic Times: failed to parse item: %s", exc)

    log.info("Economic Times: scraped %d articles", len(articles))
    return articles


# ---------------------------------------------------------------------------
# Supabase insertion
# ---------------------------------------------------------------------------

def insert_articles(articles: list[dict]) -> int:
    if not articles:
        return 0

    inserted = 0
    for article in articles:
        try:
            result = (
                sb.table("market_news")
                .upsert(article, on_conflict="url", ignore_duplicates=True)
                .execute()
            )
            if result.data:
                inserted += 1
        except Exception as exc:
            err_msg = str(exc)
            if "duplicate" in err_msg.lower() or "23505" in err_msg:
                pass
            else:
                log.warning("Insert failed for '%s': %s", article["title"][:60], exc)

    return inserted


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    log.info("Starting Indian stock market news scraper")

    all_articles: list[dict] = []
    all_articles.extend(scrape_moneycontrol())
    all_articles.extend(scrape_economic_times())

    log.info("Total articles scraped: %d", len(all_articles))

    if not all_articles:
        log.warning("No articles scraped. Exiting.")
        return

    # Deduplicate by URL
    seen: set[str] = set()
    unique: list[dict] = []
    for a in all_articles:
        if a["url"] not in seen:
            seen.add(a["url"])
            unique.append(a)

    log.info("Unique articles to insert: %d", len(unique))
    inserted = insert_articles(unique)
    log.info("Newly inserted: %d", inserted)
    log.info("Done.")


if __name__ == "__main__":
    main()
