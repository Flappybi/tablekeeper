FROM node:22.14.0-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY tsconfig.client.json vite.config.ts index.html ./
COPY src ./src
COPY client ./client
COPY public ./public
RUN npm run build && npm prune --omit=dev --no-audit --no-fund
FROM node:22.14.0-bookworm-slim
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
RUN mkdir /app/data && chown node:node /app/data
USER node
EXPOSE 8080
CMD ["node", "dist/server/index.js"]
