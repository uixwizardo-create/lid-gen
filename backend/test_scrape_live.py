import urllib.request
import json
import time

def test_live_scrape():
    print("--- 1. Triggering scrape on Render backend ---")
    req = urllib.request.Request(
        "https://lid-gen-aioq.onrender.com/api/scrape",
        data=json.dumps({
            "keyword": "Dental clinic",
            "location": "Dhaka",
            "limit": 2
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    
    try:
        res = urllib.request.urlopen(req)
        data = json.loads(res.read().decode("utf-8"))
        session_id = data["session_id"]
        print(f"Scrape dispatched successfully. Session ID: {session_id}", flush=True)
    except Exception as e:
        print(f"Error dispatching scrape: {e}", flush=True)
        return

    print("\n--- 2. Listening to Live Server-Sent Events (SSE) Stream ---", flush=True)
    stream_url = f"https://lid-gen-aioq.onrender.com/api/progress/{session_id}"
    stream_req = urllib.request.Request(stream_url)
    
    try:
        with urllib.request.urlopen(stream_req, timeout=120) as stream_res:
            for line in stream_res:
                decoded = line.decode("utf-8").strip()
                if decoded:
                    print(f"STREAM: {decoded}", flush=True)
                if "EOF" in decoded:
                    print("Stream reached EOF (Execution Finished).", flush=True)
                    break
    except Exception as e:
        print(f"Stream error or timeout: {e}", flush=True)

    print("\n--- 3. Checking Extracted Leads from Database ---")
    time.sleep(2)
    leads_url = f"https://lid-gen-aioq.onrender.com/api/leads?session_id={session_id}"
    try:
        res = urllib.request.urlopen(leads_url)
        leads = json.loads(res.read().decode("utf-8"))
        print(f"Extracted Leads Count: {leads.get('total', len(leads.get('items', [])))}")
        for lead in leads.get('items', []):
            print(f" - {lead.get('name')} | Phone: {lead.get('phone')} | Email: {lead.get('email')} | Rating: {lead.get('rating')}")
    except Exception as e:
        print(f"Error fetching leads: {e}")

if __name__ == "__main__":
    test_live_scrape()
