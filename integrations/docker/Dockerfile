FROM node:alpine
RUN apk update && apk upgrade
RUN apk add file gcc m4
RUN apk add -U --repository http://dl-cdn.alpinelinux.org/alpine/edge/testing aufs-util
COPY . /dist
RUN npm install /dist --global --omit=dev --install-links
WORKDIR /samples
CMD box-js /samples --output-dir=/samples --loglevel=debug
