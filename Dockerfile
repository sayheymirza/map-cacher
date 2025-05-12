FROM node:22-alpine

ENV NODE_ENV=production

RUN mkdir /app
WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --production --verbose

COPY . .

CMD ["npm", "run", "start"]