# --- Stage 1: Build Stage ---
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

# Copy the rest of our source code into the container.
# The .dockerignore file at the root will prevent node_modules from being copied.
COPY . .

# As a robust measure, ensure all binaries in node_modules are executable.
# The '-R' flag makes it recursive.
RUN chmod +x -R /usr/src/app/node_modules/.bin

# Compile the TypeScript code into JavaScript.
RUN npm run build

# --- Stage 2: Production Stage ---
FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

# Install ONLY the production dependencies.
RUN npm install --production

# Copy the compiled JavaScript code from the 'builder' stage.
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 3000

CMD [ "node", "dist/index.js" ]