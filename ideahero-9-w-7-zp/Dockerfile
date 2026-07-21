FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_SPACETIMEDB_HOST=https://maincloud.spacetimedb.com
ARG VITE_SPACETIMEDB_DB_NAME=ideahero-9w7zp
ENV VITE_SPACETIMEDB_HOST=$VITE_SPACETIMEDB_HOST
ENV VITE_SPACETIMEDB_DB_NAME=$VITE_SPACETIMEDB_DB_NAME

RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
