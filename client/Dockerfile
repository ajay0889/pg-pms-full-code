# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
ARG VITE_API
ENV VITE_API=${VITE_API}
# client/Dockerfile

COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
