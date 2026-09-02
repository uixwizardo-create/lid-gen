import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        
        url = "https://liidgen.vercel.app/?session=0a435658-2cfe-40e4-a50b-a88ebf14dbd8"
        print(f"Opening {url} ...")
        await page.goto(url, wait_until="networkidle")
        await asyncio.sleep(3.0)
        
        # Take screenshot
        screenshot_path = "C:/Users/Barsha/.gemini/antigravity/brain/084566b4-1524-4288-8a05-61952abc418d/live_success_screenshot.png"
        await page.screenshot(path=screenshot_path)
        print("Saved screenshot to:", screenshot_path)
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
