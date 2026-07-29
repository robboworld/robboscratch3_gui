# Pack pre-built Robbo Scratch GUI (full editor + player) into nginx.
#
# Do NOT use in-Docker `npm run build:release` alone — it installs stock
# scratch-vm without Robbo getDCA / DeviceControlAPI and crashes RobboGui.
#
# Host prep (RobboScratch monorepo):
#   ./scripts/build.sh --release web dca vm gui
# Then build this image with context = that robboscratch3_gui (must contain build/).

FROM nginx:1.25-alpine

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY build/ /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK CMD wget -qO- http://127.0.0.1/player.html >/dev/null || exit 1
