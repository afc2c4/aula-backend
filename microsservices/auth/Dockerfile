FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV PORT=3003
ENV HOST=0.0.0.0

EXPOSE 3003

CMD ["npm", "start"]