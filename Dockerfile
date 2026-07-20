# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend
FROM node:20-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm install
COPY backend/ ./
# Force rebuild v3
RUN npm run build

# Stage 3: Production
FROM node:20-alpine
WORKDIR /app

# Copy backend build and deps
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --omit=dev
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/src/db/migrations ./src/db/migrations

# Copy frontend build to serve statically
COPY --from=frontend-build /app/frontend/dist ./public

# Create uploads directory
RUN mkdir -p uploads

# Environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "node dist/migrate.js && node dist/index.js"]
