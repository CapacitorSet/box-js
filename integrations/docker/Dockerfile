FROM node:8-alpine
RUN apk update && apk upgrade
RUN apk add file gcc m4
RUN apk add -U --repository http://dl-cdn.alpinelinux.org/alpine/edge/testing aufs-util
RUN npm install box-js --global --production
WORKDIR /samples
CMD box-js /samples --output-dir=/samples --loglevel=debug
