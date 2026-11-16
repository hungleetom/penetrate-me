# penetrate.me

The internet's least secure social network.

## Shannon from Docker on Kali

For this disposable lab, `SHANNON_DOCKER_ACCESS=1` additionally permits the exact
HTTP Host `172.17.0.1:3001` and enables that hostname for Next.js development
assets. Without the flag, application requests still accept only `localhost`
and `127.0.0.1`. Other bridge addresses, ports, and LAN/public hostnames remain
rejected. Forwarded headers do not grant access.

Stop the existing app with Ctrl+C, then update and restart it:

```bash
cd ~/pentest/penetrate-me
git pull --ff-only origin main
SHANNON_DOCKER_ACCESS=1 npm run dev
```

The app stays bound to `127.0.0.1:3000`. In another terminal, keep the TCP
forwarder bound only to Docker's bridge gateway (restart an existing forwarder
only if needed):

```bash
socat TCP-LISTEN:3001,bind=172.17.0.1,reuseaddr,fork TCP:127.0.0.1:3000
```

Verify from a container, then use `http://172.17.0.1:3001` as Shannon's target:

```bash
docker run --rm curlimages/curl -i http://172.17.0.1:3001
```

Expect HTTP 200 with the app's HTML. This setup assumes Docker's bridge gateway
is `172.17.0.1`, as reported by `docker network inspect bridge`. Host validation
is not a client firewall; keep the bridge inside your trusted local lab. After
testing, stop the forwarder and restart the app without the flag.
