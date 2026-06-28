# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# VITE_API_BASE_URL is injected at build time so the bundle knows where to hit
# the backend.  Pass it with --build-arg or via docker-compose build args.
# Example: --build-arg VITE_API_BASE_URL=https://api.yourdomain.com
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build


# ── Stage 2: nginx runtime ────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Replace default nginx config with one that handles SPA routing (React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
