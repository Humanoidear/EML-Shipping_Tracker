# Build stage: compile the React app
FROM node:22-alpine AS build
WORKDIR /app
ENV NODE_OPTIONS=--max-old-space-size=1536
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve stage: static files + API reverse proxy
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
