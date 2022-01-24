FROM node:16-bullseye-slim

COPY . .

RUN npm install

CMD ["npm", "run", "test"]