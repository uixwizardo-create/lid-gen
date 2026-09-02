import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: console_logs.append(f"[ERROR] {err}"))
        
        print("Navigating to https://liidgen.vercel.app ...", flush=True)
        await page.goto("https://liidgen.vercel.app", wait_until="networkidle")
        await asyncio.sleep(2.0)
        
        btn = await page.query_selector("button:has-text('Real estate in Dubai')")
        if btn:
            print("Found 'Real estate in Dubai', clicking...", flush=True)
            await btn.click()
            await asyncio.sleep(5.0)
            
            # Screenshot after click
            shot_path = "C:/Users/Barsha/.gemini/antigravity/brain/084566b4-1524-4288-8a05-61952abc418d/after_click.png"
            await page.screenshot(path=shot_path)
            print("Screenshot saved to:", shot_path, flush=True)
            
        print("\nConsole logs:", flush=True)
        for log in console_logs:
            print(log, flush=True)
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
