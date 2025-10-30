import os
import re
import urllib.parse
import gzip
from flask import Flask, request, Response, redirect, send_file
import requests

app = Flask(__name__, static_folder='static')

# CONFIG
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

# Helper: decompress if needed
def decompress_content(content: bytes) -> bytes:
    if content.startswith(b'\x1f\x8b'):  # gzip magic bytes
        try:
            return gzip.decompress(content)
        except:
            pass
    return content

# Helper: rewrite URLs in HTML/JS/CSS to proxy them
URL_RE = re.compile(r'(?i)(href|src|action|data-src|poster|content|data-url|background|style)=["\']?([^"\'> ;]+)["\'> ;]?')

def rewrite_content(content: bytes, base_url: str, content_type: str) -> bytes:
    if 'text/html' in content_type or 'javascript' in content_type or 'json' in content_type or 'css' in content_type:
        text = content.decode('utf-8', errors='ignore')

        def repl(match):
            attr, url = match.groups()
            if url.startswith(('data:', 'mailto:', 'tel:', '#', 'javascript:')):
                return match.group(0)
            full_url = urllib.parse.urljoin(base_url, url.strip('\'"'))
            proxied = f"/proxy/{urllib.parse.quote(full_url)}"
            return f'{attr}="{proxied}"'

        rewritten = URL_RE.sub(repl, text)
        # Extra for CSS URLs
        rewritten = re.sub(r'url\(["\']?([^"\')]+)["\']?\)', lambda m: f'url("/proxy/{urllib.parse.quote(urllib.parse.urljoin(base_url, m.group(1)))}")', rewritten)
        return rewritten.encode('utf-8')
    return content

# Proxy endpoint
@app.route("/proxy/<path:url>")
def proxy(url):
    target = urllib.parse.unquote(url)
    if not target.startswith(('http://', 'https://')):
        target = 'https://' + target

    headers = {k: v for k, v in request.headers if k.lower() != 'host'}
    headers.update(DEFAULT_HEADERS)

    try:
        resp = requests.get(target, headers=headers, timeout=10, allow_redirects=True)
        resp.raise_for_status()
    except requests.RequestException as e:
        return handle_error(str(e))

    content = decompress_content(resp.content)
    content_type = resp.headers.get('Content-Type', '')

    content = rewrite_content(content, target, content_type)

    response = Response(content, status=resp.status_code)
    response.headers['Content-Type'] = content_type
    response.headers['Content-Length'] = len(content)
    return response

# Error handling like a browser
def handle_error(message):
    error_html = f"""
    <!DOCTYPE html>
    <html>
    <head><title>Error</title></head>
    <body>
        <h1>Oops! Something went wrong.</h1>
        <p>{message}</p>
        <p>Try checking the URL or your connection.</p>
    </body>
    </html>
    """
    return Response(error_html, status=500, headers={'Content-Type': 'text/html'})

# Serve client UI
@app.route("/")
def home():
    return send_file('static/index.html')

# For Render
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))