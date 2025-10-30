import os
import re
import urllib.parse
import gzip
import zlib
from flask import Flask, request, Response, redirect, send_file
import requests

app = Flask(__name__, static_folder='static')

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

def decompress_content(content: bytes) -> bytes:
    if content.startswith(b'\x1f\x8b'):
        try:
            return gzip.decompress(content)
        except:
            pass
    elif len(content) > 2 and content[0] == 0x78:
        try:
            return zlib.decompress(content, -zlib.MAX_WBITS)
        except:
            pass
    return content

URL_RE = re.compile(r'(?i)(href|src|action|data-src|poster|content|data-url|background-image|style)=["\']?([^"\'> ;}]+)["\'> ;}]?')

def rewrite_content(content: bytes, base_url: str, content_type: str) -> bytes:
    if any(ct in content_type.lower() for ct in ['text/html', 'javascript', 'json', 'css']):
        try:
            text = content.decode('utf-8', errors='ignore')

            def repl(match):
                attr, url = match.groups()
                if any(url.startswith(p) for p in ('data:', 'mailto:', 'tel:', '#', 'javascript:', 'blob:')):
                    return match.group(0)
                full_url = urllib.parse.urljoin(base_url, url.strip('\'"'))
                proxied = f"/proxy/{urllib.parse.quote(full_url, safe=':/?#[]@!$&\\'()*+,;=')}"
                return f'{attr}="{proxied}"'

            text = URL_RE.sub(repl, text)

            if 'css' in content_type.lower():
                text = re.sub(
                    r'url\(["\']?([^"\')]+)["\']?\)',
                    lambda m: f'url("/proxy/{urllib.parse.quote(urllib.parse.urljoin(base_url, m.group(1)), safe=":/?#[]@!$&\\'()*+,;=")}")',
                    text
                )

            return text.encode('utf-8')
        except Exception as e:
            print(f"Rewrite error: {e}")
    return content

@app.route("/proxy/<path:url>", methods=['GET', 'POST', 'PUT', 'DELETE'])
def proxy(url):
    target = urllib.parse.unquote(url)
    if not target.startswith(('http://', 'https://')):
        target = 'https://' + target

    headers = {k: v for k, v in request.headers if k.lower() not in ('host', 'content-length', 'content-encoding')}
    headers.update(DEFAULT_HEADERS)

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
            stream=False
        )
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"Proxy error: {e}")
        return handle_error(f"Failed to reach site: {e}")

    content = decompress_content(resp.content)
    content_type = resp.headers.get('Content-Type', 'text/html')
    content = rewrite_content(content, target, content_type)

    response = Response(content, status=resp.status_code)
    excluded = ['content-encoding', 'transfer-encoding', 'content-length', 'connection', 'server', 'date']
    for k, v in resp.headers.items():
        if k.lower() not in excluded:
            response.headers[k] = v

    response.headers.pop('Content-Encoding', None)
    response.headers.pop('Transfer-Encoding', None)
    response.headers['Content-Length'] = str(len(content))
    response.headers['Content-Type'] = content_type.split(';')[0]

    for cookie in resp.cookies:
        response.set_cookie(cookie.name, cookie.value, path=cookie.path or '/', secure=cookie.secure)

    return response

def handle_error(message):
    html = f"""
    <!DOCTYPE html>
    <html><head><title>Browser Error</title></head>
    <body style="font-family:Arial;text-align:center;padding:50px;background:#f9f9f9;">
        <h1>Browser Error</h1>
        <p><strong>{message}</strong></p>
        <p><a href="/proxy/https://www.example.com">Go Home</a></p>
    </body></html>
    """
    return Response(html, status=502, headers={'Content-Type': 'text/html'})

@app.route("/")
def home():
    return send_file('static/index.html')

@app.route("/health")
def health():
    return "OK", 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)
