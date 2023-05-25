FROM node:18

WORKDIR /app

RUN apt-get update && apt-get install -y \
  git \
  openssh-client \
  openssh-server \
  python3 \
    python3-pip \
    python3-setuptools \
    python3-wheel \
    build-essential \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./

RUN npm i

COPY . .

CMD ["npm", "start"]