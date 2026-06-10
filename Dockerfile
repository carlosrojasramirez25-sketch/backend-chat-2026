FROM node:20
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

# Placeholder so prisma generate works during install (no real DB connection needed)
ENV DATABASE_URL=mysql://build:build@localhost:3306/build

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main"]
