FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace configurations
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/api/tsconfig.json apps/api/tsconfig.json

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy source code and build
COPY apps/api apps/api
RUN npm run build --workspace apps/api

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy root workspace configs for production installation
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built application
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3001

CMD ["node", "apps/api/dist/main.js"]
