# syntax=docker/dockerfile:1.3-labs
FROM node:16-bullseye-slim

WORKDIR /app
COPY . .

RUN npm install

CMD ["npm", "run", "test"]