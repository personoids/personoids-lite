FROM personoids/plugin-base

WORKDIR /app

COPY package.json ./

RUN npm i

COPY . .

CMD ["npm", "start"]