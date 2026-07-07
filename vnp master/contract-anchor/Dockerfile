FROM node:18-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

RUN npx hardhat compile

CMD ["npm", "start"]
