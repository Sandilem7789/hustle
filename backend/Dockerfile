FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . ./
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=base /app .
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/server.js"]
