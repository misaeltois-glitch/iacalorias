FROM node:20-slim

RUN npm install -g pnpm@10

WORKDIR /app

COPY . .

RUN pnpm install --no-frozen-lockfile

RUN node scripts/build-railway.mjs

EXPOSE 3000

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
