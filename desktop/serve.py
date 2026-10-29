#!/usr/bin/env python3
"""Serve the bundled app on one stable loopback origin. No external packages."""
import argparse
import functools
import http.server
import json
import pathlib
import threading
import urllib.error
import urllib.request
import webbrowser

VERSION = "0.1.0"
HOST = "127.0.0.1"
PORT = 8765
APP_DIR = pathlib.Path(__file__).resolve().parent


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/__midad_health":
            body = json.dumps({"app": "midad", "version": VERSION}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description="مداد — دفتر دراسة محلي")
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    if not (APP_DIR / "app" / "index.html").is_file():
        parser.error("Bundled app/index.html is missing. Extract the complete package first.")
    url = f"http://{HOST}:{PORT}/"
    handler = functools.partial(Handler, directory=str(APP_DIR / "app"))
    try:
        server = http.server.ThreadingHTTPServer((HOST, PORT), handler)
    except OSError as error:
        try:
            with urllib.request.urlopen(url + "__midad_health", timeout=2) as response:
                existing = json.load(response)
            if existing.get("app") != "midad":
                raise ValueError("Port belongs to another app")
        except (OSError, ValueError, urllib.error.URLError) as probe_error:
            parser.error(f"Port {PORT} is busy. Close its application and try again. {error}; {probe_error}")
        print(f"Midad is already running: {url}", flush=True)
        if not args.no_browser:
            webbrowser.open(url)
        return
    print(f"Midad {VERSION}: {url}\nKeep this window open. Press Ctrl+C to stop.\nUse the same browser profile to open your notes.", flush=True)
    if not args.no_browser:
        threading.Timer(0.3, webbrowser.open, args=(url,)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
