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
    build-essential libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libasound2 \
  && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip

COPY requirements.txt ./

RUN pip install -r requirements.txt

COPY package.json ./

RUN npm i

RUN npm i -g axios sharp puppeteer express openai uuid jsdom langchain

COPY . .

CMD ["npm", "start"]