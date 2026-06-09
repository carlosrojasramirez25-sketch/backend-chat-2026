FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

# Placeholder DATABASE_URL so prisma generate works during npm ci (no real DB needed)
ENV DATABASE_URL=mysql://build:build@localhost:3306/build

RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main"]
