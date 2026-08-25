import urllib.request
import json
import zipfile
import io

repo = "Chiprut-Eight/ShawarmaRadar"
url = f"https://api.github.com/repos/{repo}/actions/runs?per_page=1"

req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode())
    
run_id = data['workflow_runs'][0]['id']
print(f"Run ID: {run_id}")

log_url = f"https://api.github.com/repos/{repo}/actions/runs/{run_id}/logs"
try:
    req = urllib.request.Request(log_url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        with zipfile.ZipFile(io.BytesIO(response.read())) as z:
            for filename in z.namelist():
                if "scan-and-deploy" in filename or "Deploy to Firebase Hosting" in filename:
                    print(f"\n--- {filename} ---")
                    content = z.read(filename).decode('utf-8')
                    # Print last 50 lines
                    print("\n".join(content.splitlines()[-50:]))
except Exception as e:
    print(f"Failed to fetch logs: {e}")
