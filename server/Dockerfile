FROM node as builder

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# add client build, and copy to the "client" folder

FROM node

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --legacy-peer-deps --omit=dev
COPY --from=builder /usr/src/app/dist ./dist

ENV NODE_ENV production
ENV PORT 80
EXPOSE 80
CMD [ "npm", "start" ]
