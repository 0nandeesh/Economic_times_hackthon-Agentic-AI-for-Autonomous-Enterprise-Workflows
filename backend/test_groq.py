import sys
sys.path.append('.')
import main
import urllib.request, json

print("Testing direct Groq call from backend...")
prompt = "Extract tasks with story points, owner, priority from this text. Return ONLY a JSON array of objects with keys: title, owner, story_points, priority. Text: Sarah needs to set up the DB."

try:
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {main.settings.groq_api_key}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
    }
    payload = {
        "model": "llama3-8b-8192", 
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "response_format": {"type": "json_object"}
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
    with urllib.request.urlopen(req, timeout=12) as response:
        print("Success!", response.read().decode('utf-8'))
except Exception as e:
    print(getattr(e, "read", lambda: b"")().decode("utf-8"))
