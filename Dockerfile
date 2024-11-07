FROM node:20.10.0-alpine3.19 AS build
WORKDIR /usr
COPY package*.json ./
RUN npm ci
COPY ./ ./
RUN npx prisma generate
RUN npm run build
RUN npm ci --omit=dev

FROM node:20.10.0-alpine3.19 AS production
WORKDIR /app
COPY --chown=node:node --from=build /usr/prisma /app/prisma/
COPY --chown=node:node --from=build /usr/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/dist ./dist
COPY --chown=node:node --from=build /usr/view ./view

USER node
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
