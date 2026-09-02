import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        
        # Navigate to the latest running session or root
        print("Opening https://liidgen.vercel.app ...", flush=True)
        await page.goto("https://liidgen.vercel.app", wait_until="networkidle")
        await asyncio.sleep(4.0)
        
        # Check if there is a recent session item in the sidebar
        sidebar_item = await page.query_selector("button:has-text('Real estate · Dubai')")
        if sidebar_item:
            print("Found 'Real estate · Dubai' in sidebar, clicking it...", flush=True)
            await sidebar_item.click()
            await asyncio.sleep(2.0)
            
        shot_path = "C:/Users/Barsha/.gemini/antigravity/brain/084566b4-1524-4288-8a05-61952abc418d/real_estate_dubai_progress.png"
        await page.screenshot(path=shot_path)
        print("Screenshot saved to:", shot_path, flush=True)
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
