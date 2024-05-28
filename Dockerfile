FROM node as server-builder

WORKDIR /usr/src/app
COPY server/package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM node as client-builder

WORKDIR /usr/src/app
COPY web_client/package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM node

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --legacy-peer-deps --omit=dev
COPY --from=server-builder /usr/src/app/dist ./dist
COPY --from=client-builder /usr/src/app/dist ./client

ENV NODE_ENV production
ENV PORT 80
EXPOSE 80
CMD [ "npm", "start" ]
