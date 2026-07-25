FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_SPACETIMEDB_HOST=https://maincloud.spacetimedb.com
ARG VITE_SPACETIMEDB_DB_NAME=ideahero-9w7zp
ENV VITE_SPACETIMEDB_HOST=$VITE_SPACETIMEDB_HOST
ENV VITE_SPACETIMEDB_DB_NAME=$VITE_SPACETIMEDB_DB_NAME

RUN npm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/build ./build

EXPOSE 3000

CMD ["npm", "run", "start"]
