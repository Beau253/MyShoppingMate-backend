# --- Stage 1: Build Stage ---
# Use a specific Node.js version to ensure consistency. 'alpine' is a lightweight Linux distribution.
FROM node:18-alpine AS builder

# Set the working directory inside the container.
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json files first.
# This leverages Docker's layer caching. These files change less often than our source code,
# so the 'npm install' step won't re-run unless our dependencies change.
COPY package*.json ./

# Install all production dependencies.
RUN npm install

# Copy the rest of our source code into the container.
COPY . .

# Compile the TypeScript code into JavaScript.
# The output will be in a 'dist' directory as defined by tsconfig.json.
RUN npm run build

# --- Stage 2: Production Stage ---
# Use a fresh, even more lightweight Node.js image for the final production container.
FROM node:18-alpine

WORKDIR /usr/src/app

# Copy the package.json and package-lock.json again.
COPY package*.json ./

# Install ONLY the production dependencies. This makes the final image much smaller
# because it doesn't include development tools like TypeScript.
RUN npm install --production

# Copy the compiled JavaScript code from the 'builder' stage.
COPY --from=builder /usr/src/app/dist ./dist

# Expose the port that the service will run on.
EXPOSE 3000

# The command to run when the container starts.
# This executes the compiled JavaScript entry point.
CMD [ "node", "dist/index.js" ]