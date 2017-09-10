FROM node:8-alpine
RUN apk update && apk upgrade
RUN apk add file gcc m4
RUN npm install box-js --global --production
WORKDIR /samples
CMD box-js /samples --output-dir=/samples --loglevel=debug
