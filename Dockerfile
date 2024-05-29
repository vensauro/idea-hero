FROM node as server_builder

WORKDIR /usr/src/app
COPY server/package*.json ./
RUN npm ci --legacy-peer-deps
COPY server/ .
RUN npm run build


FROM node as client_builder

WORKDIR /usr/src/app
COPY web_client/package*.json web_client/
COPY shared/ shared/
WORKDIR /usr/src/app/web_client
RUN npm ci
COPY web_client/ .
RUN npm run build


FROM node

WORKDIR /usr/src/app
COPY server/package*.json ./
RUN npm ci --legacy-peer-deps --omit=dev
COPY --from=server_builder /usr/src/app/dist ./dist
COPY --from=client_builder /usr/src/app/web_client/dist ./client

ENV NODE_ENV production
ENV PORT 80
EXPOSE 80
CMD [ "npm", "start" ]
