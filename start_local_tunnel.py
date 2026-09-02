import os
import sys
import time
import re
import urllib.request
import subprocess

CLOUDFLARED_URL = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
CLOUDFLARED_EXE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cloudflared.exe")

def ensure_cloudflared():
    if not os.path.exists(CLOUDFLARED_EXE):
        print("[*] Downloading Cloudflare Tunnel binary (one-time setup)...", flush=True)
        try:
            urllib.request.urlretrieve(CLOUDFLARED_URL, CLOUDFLARED_EXE)
            print("[+] Cloudflare Tunnel binary downloaded successfully!", flush=True)
        except Exception as e:
            print(f"[-] Error downloading cloudflared: {e}", flush=True)
            return False
    return True

def run_backend():
    print("[*] Starting FastAPI Backend Server on port 8000...", flush=True)
    backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
    python_exe = sys.executable
    venv_python = os.path.join(backend_dir, ".venv", "Scripts", "python.exe")
    if os.path.exists(venv_python):
        python_exe = venv_python

    cmd = [python_exe, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"]
    return subprocess.Popen(cmd, cwd=backend_dir)

def run_tunnel():
    print("[*] Connecting Cloudflare Secure Tunnel...", flush=True)
    cmd = [CLOUDFLARED_EXE, "tunnel", "--url", "http://127.0.0.1:8000"]
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    tunnel_url = None
    for line in iter(proc.stdout.readline, ''):
        line = line.strip()
        if "trycloudflare.com" in line:
            match = re.search(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com', line)
            if match:
                tunnel_url = match.group(0)
                print("\n" + "=" * 70, flush=True)
                print(">>> LID-GEN LOCAL HIGH-SPEED ENGINE IS WORLDWIDE LIVE! <<<", flush=True)
                print("=" * 70, flush=True)
                print(f"Local Backend:  http://localhost:8000/api", flush=True)
                print(f"Worldwide URL:  {tunnel_url}/api", flush=True)
                print(f"Web Dashboard:  https://liidgen.vercel.app", flush=True)
                print("=" * 70, flush=True)
                print("HOW TO CONNECT FROM ANY DEVICE:", flush=True)
                print(f"1. Open https://liidgen.vercel.app on any device (phone/laptop).", flush=True)
                print(f"2. Go to Settings (gear icon) -> Backend Engine Server.", flush=True)
                print(f"3. Select 'Local / Tunnel Engine' and paste: {tunnel_url}/api", flush=True)
                print(f"   (Or simply open: https://liidgen.vercel.app/?api={tunnel_url}/api)", flush=True)
                print("=" * 70 + "\n", flush=True)
                break
    return proc

def main():
    print("=" * 70)
    print("   Lid-Gen Hybrid High-Speed Engine & Cloudflare Tunnel Launcher")
    print("=" * 70)

    if not ensure_cloudflared():
        print("Falling back to local-only mode (http://localhost:8000/api)...")

    backend_proc = run_backend()
    time.sleep(2)

    tunnel_proc = None
    if os.path.exists(CLOUDFLARED_EXE):
        tunnel_proc = run_tunnel()

    print("Engine is running! Press Ctrl + C to stop.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping services...")
        if tunnel_proc:
            tunnel_proc.terminate()
        backend_proc.terminate()
        print("Services stopped cleanly.")

if __name__ == "__main__":
    main()
