"""Dev server: static files with caching disabled (so edits show on refresh)."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()


if __name__ == '__main__':
    ThreadingHTTPServer(('', 8123), NoCacheHandler).serve_forever()
