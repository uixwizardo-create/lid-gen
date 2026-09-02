import asyncio
import sys
from app.scraper import scrape_google_maps

async def main():
    async def cb(msg):
        print(f"[CALLBACK] {msg}", flush=True)

    print("Starting local scrape test...")
    leads = await scrape_google_maps(
        keyword="Dental clinic",
        location="Dhaka",
        limit=2,
        progress_callback=cb
    )
    print(f"\n--- Scraping Finished! Total leads: {len(leads)} ---")
    for i, l in enumerate(leads, 1):
        print(f"[{i}] {l.get('name')} | Phone: {l.get('phone')} | Email: {l.get('email')} | Web: {l.get('website')}")

if __name__ == "__main__":
    asyncio.run(main())
