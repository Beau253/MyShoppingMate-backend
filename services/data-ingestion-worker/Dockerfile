# --- Stage 1: Build Stage ---
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN chmod +x -R /usr/src/app/node_modules/.bin
RUN npm run build

# --- Stage 2: Production Stage ---
FROM node:18-alpine

WORKDIR /usr/src/app

# --- PUPPETEER DEPENDENCIES ---
# Install the system libraries required to run the headless Chromium browser.
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      fontconfig

# Tell Puppeteer to use the Chromium instance we just installed.
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package*.json ./
RUN npm install --production

COPY --from=builder /usr/src/app/dist ./dist

CMD [ "node", "dist/index.js" ]