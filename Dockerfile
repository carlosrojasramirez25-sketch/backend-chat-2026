FROM node:20
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

# Placeholder so prisma generate works during npm ci (no real DB connection needed)
ENV DATABASE_URL=mysql://build:build@localhost:3306/build

RUN npm ci

COPY . .

RUN npm run build && echo "=== Build OK ===" && ls -la dist/ && echo "dist/main.js exists: $(test -f dist/main.js && echo YES || echo NO)"

EXPOSE 3000

CMD ["node", "dist/main"]
