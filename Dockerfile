
FROM node:20-slim AS build

WORKDIR /app

# Ensure devDependencies (including Vite) are installed
ENV NODE_ENV=development

# Install ALL dependencies including dev, using npm ci for reproducibility
COPY package*.json ./
COPY package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
ENV PATH="/app/node_modules/.bin:$PATH"
RUN npx vite build

# ---------- RUNTIME STAGE ----------

FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Install only production dependencies
COPY package*.json ./
COPY package-lock.json ./
RUN npm ci --omit=dev

# Copy built assets, server script, lib directory, and server utilities
COPY --from=build /app/dist ./dist
COPY --from=build /app/lib ./lib
COPY --from=build /app/server ./server
COPY server.mjs ./server.mjs

EXPOSE 8080
CMD ["node", "server.mjs"]
