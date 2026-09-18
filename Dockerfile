# syntax=docker/dockerfile:1

FROM node:22-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:22-alpine AS backend
WORKDIR /backend
COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma
RUN npm ci
COPY backend/ ./
RUN npx prisma generate && npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
RUN apk add --no-cache openssl libc6-compat \
  && addgroup -S app && adduser -S app -G app
COPY --from=backend --chown=app:app /backend/node_modules ./node_modules
COPY --from=backend --chown=app:app /backend/dist ./dist
COPY --from=backend --chown=app:app /backend/prisma ./prisma
COPY --from=backend --chown=app:app /backend/package.json ./package.json
COPY --from=frontend --chown=app:app /frontend/dist ./public
COPY --chown=app:app scripts/start.sh ./start.sh
RUN chmod +x ./start.sh
USER app
EXPOSE 8080
CMD ["./start.sh"]
