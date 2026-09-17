import http.server
import socketserver
import os
import sys

DIRECTORY = "/data/data/com.termux/files/home/KineticStudio"
PORT = 5050

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Force mobile and desktop browsers to never cache HTML, CSS, or JS responses
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

def run():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), NoCacheHTTPRequestHandler) as httpd:
        print(f"Serving {DIRECTORY} on port {PORT} with strict NO-CACHE headers...")
        httpd.serve_forever()

if __name__ == "__main__":
    run()
