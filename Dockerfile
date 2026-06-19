# Multi-stage build for Robbo Scratch GUI (includes player.html embed entry).
FROM node:16-alpine AS builder

RUN apk add --no-cache git python3 make g++

# scratch-l10n is a file:../robboscratch3_I10n dependency — build it first.
RUN git clone --depth 1 https://github.com/robboworld/robboscratch3_I10n.git /robboscratch3_I10n
WORKDIR /robboscratch3_I10n
RUN npm ci --legacy-peer-deps && npm run build

# sensor_actions.js resolves mqtt from sibling robboscratch3_vm checkout.
RUN git clone --depth 1 https://github.com/robboworld/robboscratch3_vm.git /robboscratch3_vm \
    && cd /robboscratch3_vm && npm install mqtt --legacy-peer-deps --no-save

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

COPY . .
RUN npm run build:release

FROM nginx:1.25-alpine

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK CMD wget -qO- http://127.0.0.1/player.html >/dev/null || exit 1
