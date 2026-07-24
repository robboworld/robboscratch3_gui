# Prefer: docker compose with dockerfile: deploy/Dockerfile
# Packs pre-built build/ (from RobboScratch ./scripts/build.sh --release web dca vm gui).
FROM nginx:1.25-alpine

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY build/ /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK CMD wget -qO- http://127.0.0.1/player.html >/dev/null || exit 1
