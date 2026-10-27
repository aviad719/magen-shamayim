#!/bin/sh
# Assemble the published site (https://magen-shamayim.sites.tab.bot/): tower defense at the root, the RTS at /rts/.
# Both games share localStorage because they live on the same origin.
set -e
rm -rf dist && mkdir -p dist/rts
cp -r tower-defense/site/. dist/
cp -r rts/index.html rts/style.css rts/js dist/rts/
echo "dist/ ready: open with  python3 -m http.server -d dist 8000"
