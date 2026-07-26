FROM node:22-alpine

RUN apk add --no-cache \
    libc6-compat \
    vips-dev \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . ./

EXPOSE 3000
CMD ["npm", "run", "dev"]