import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        
        url = "https://liidgen.vercel.app"
        print(f"Opening {url} ...")
        await page.goto(url, wait_until="networkidle")
        await asyncio.sleep(2.0)
        
        # Click on prompt suggestion "Real estate in Dubai"
        btn = await page.query_selector("button:has-text('Real estate in Dubai')")
        if btn:
            print("Clicking 'Real estate in Dubai' button...")
            await btn.click()
            
            print("Waiting for scrape to finish and leads table to appear...")
            # Wait up to 60 seconds for the table or logs
            try:
                await page.wait_for_selector("div:has-text('Extracted Database'), table", timeout=60000)
                print("Leads table successfully appeared in the UI!")
                await asyncio.sleep(4.0)
                
                screenshot_path = "C:/Users/Barsha/.gemini/antigravity/brain/084566b4-1524-4288-8a05-61952abc418d/dubai_leads_screenshot.png"
                await page.screenshot(path=screenshot_path)
                print("Saved screenshot to:", screenshot_path)
            except Exception as e:
                print("Timeout waiting for table:", e)
                # Take fallback screenshot
                await page.screenshot(path="C:/Users/Barsha/.gemini/antigravity/brain/084566b4-1524-4288-8a05-61952abc418d/fallback_screenshot.png")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
