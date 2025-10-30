import os
import re
import urllib.parse
import gzip
import zlib
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

# Helper: decompress if needed (gzip + deflate)
def decompress_content(content: bytes) -> bytes:
    if content.startswith(b'\x1f\x8b'):  # gzip
        try:
            return gzip.decompress(content)
        except:
            pass
    elif len(content) > 2 and (content[0] == 0x78 and content[1] in (0x01, 0x5e, 0x9c, 0xda)):  # deflate
        try:
            return zlib.decompress(content, -zlib.MAX_WBITS)
        except:
            pass
    return content

# Helper: rewrite URLs in content
URL_RE = re.compile(r'(?i)(href|src|action|data-src|poster|content|data-url|background-image|style)=["\']?([^"\'> ;]+)["\'> ;]?')

def rewrite_content(content: bytes, base_url: str, content_type: str) -> bytes:
    if any(ct in content_type for ct in ['text/html', 'javascript', 'json', 'css']):
        try:
            text = content.decode('utf-8', errors='ignore')

            def repl(match):
                attr, url = match.groups()
                if any(url.startswith(prefix) for prefix in ('data:', 'mailto:', 'tel:', '#', 'javascript:', 'blob:')):
                    return match.group(0)
                full_url = urllib.parse.urljoin(base_url, url.strip('\'"'))
                proxied = f"/proxy/{urllib.parse.quote(full_url, safe=':/?#[]@!$&\'()*+,;=')}"
                return f'{attr}="{proxied}"'

            rewritten = URL_RE.sub(repl, text)
            
            # CSS url() rewriting
            if 'css' in content_type:
                rewritten = re.sub(r'url\(["\']?([^"\')]+)["\']?\)', 
                                 lambda m: f'url("/proxy/{urllib.parse.quote(urllib.parse.urljoin(base_url, m.group(1)))}")', 
                                 rewritten)
            
            # JS/JSON instagram-like URLs (generalize)
            rewritten = re.sub(r'("https?://[^"]+")[,\s}]', 
                             lambda m: f'"/proxy{urllib.parse.quote(m.group(1)[1:-1])}"{m.group(0)[-1]}', 
                             rewritten)
            
            return rewritten.encode('utf-8')
        except Exception as e:
            print(f"Rewrite error: {e}")  # Log to Render
    return content

# Proxy endpoint (handle GET/POST/etc.)
@app.route("/proxy/<path:url>", methods=['GET', 'POST', 'PUT', 'DELETE'])
def proxy(url):
    target = urllib.parse.unquote(url)
    if not target.startswith(('http://', 'https://')):
        target = 'https://' + target

    headers = {k: v for k, v in request.headers if k.lower() not in ('host', 'content-length')}
    headers.update(DEFAULT_HEADERS)
    
    # Forward body for POST/forms
    data = request.get_data() if request.method in ['POST', 'PUT'] else None

    try:
        resp = requests.request(
            method=request.method,
            url=target,
            headers=headers,
            data=data,
            cookies=request.cookies,
            allow_redirects=True,
            timeout=15,
        )
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"Proxy error: {e}")  # Log
        return handle_error(str(e))

    content = decompress_content(resp.content)
    content_type = resp.headers.get('Content-Type', 'text/html')

    # Rewrite only if text-based
    content = rewrite_content(content, target, content_type)

    response = Response(content, status=resp.status_code)
    response.headers['Content-Type'] = content_type
    response.headers['Content-Length'] = str(len(content))
    
    # Forward cookies
    for cookie in resp.cookies:
        response.set_cookie(cookie.name, cookie.value, path=cookie.path, secure=cookie.secure)
    
    return response

# Error page
def handle_error(message):
    error_html = f"""
    <!DOCTYPE html>
    <html><head><title>Error</title></head>
    <body style="font-family:Arial;text-align:center;padding:50px;">
        <h1>🌐 Oops! Navigation Error</h1>
        <p>{message}</p>
        <p><a href="/proxy/https://www.example.com">Go to Example.com</a></p>
    </body></html>
    """
    return Response(error_html, status=502, headers={'Content-Type': 'text/html'})

# Serve UI
@app.route("/")
def home():
    return send_file('static/index.html')

@app.route("/health")
def health():
    return "OK", 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)