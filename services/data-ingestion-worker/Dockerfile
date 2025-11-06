# Revert to the simple, lightweight Dockerfile.
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN chmod +x -R /usr/src/app/node_modules/.bin
RUN npm run build

FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production
COPY --from=builder /usr/src/app/dist ./dist

CMD [ "node", "dist/index.js" ]