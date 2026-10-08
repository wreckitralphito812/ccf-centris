// Local stand-in for Supabase's API gateway: /rest/v1/* → PostgREST on 54321.
import http from "node:http";

http
  .createServer((req, res) => {
    if (!req.url.startsWith("/rest/v1")) {
      res.writeHead(404);
      return res.end("Only /rest/v1 is served here.");
    }
    const up = http.request(
      { host: "127.0.0.1", port: 54321, path: req.url.slice("/rest/v1".length) || "/", method: req.method, headers: { ...req.headers, host: "127.0.0.1:54321" } },
      (r) => {
        res.writeHead(r.statusCode ?? 502, r.headers);
        r.pipe(res);
      },
    );
    up.on("error", (e) => {
      res.writeHead(502);
      res.end(String(e));
    });
    req.pipe(up);
  })
  .listen(54320, "127.0.0.1");
