import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        console_logs = []
        page_errors = []
        network_requests = []
        failed_requests = []

        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: page_errors.append(str(err)))
        page.on("request", lambda req: network_requests.append(f"{req.method} {req.url}"))
        page.on("requestfailed", lambda req: failed_requests.append(f"FAILED: {req.method} {req.url} ({req.failure})"))
        page.on("response", lambda res: network_requests.append(f"RESP {res.status} {res.url}"))

        print("--- Navigating to https://liidgen.vercel.app ---")
        await page.goto("https://liidgen.vercel.app", wait_until="networkidle")
        await asyncio.sleep(2.0)

        print("\n--- All Network Requests & Status ---")
        for req in network_requests:
            print(req)

        print("\n--- Failed Network Requests ---")
        for req in failed_requests:
            print(req)

        # Click on prompt sample button "Marketing agencies in London" or input prompt
        print("\n--- Testing prompt input & click ---")
        sample_btn = await page.query_selector("button:has-text('Marketing agencies in London')")
        if sample_btn:
            print("Found sample button, clicking it...")
            await sample_btn.click()
            await asyncio.sleep(1.0)
            
            # Click the send/arrow button
            send_btn = await page.query_selector("button:has(svg.rotate-90), button.bg-gradient-to-br")
            if send_btn:
                print("Found send button, clicking it...")
                await send_btn.click()
                await asyncio.sleep(4.0)
            else:
                print("Send button not found by selector")
        else:
            print("Sample button not found")

        print("\n--- Post-Click Console Logs ---")
        for log in console_logs[-15:]:
            print(log)

        print("\n--- Post-Click Failed Network Requests ---")
        for req in failed_requests:
            print(req)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
