FROM node:8-alpine
#ENV http_proxy http://PROXY_IP:PORT
#ENV https_proxy http://PROXY_IP:PORT
RUN apk update && apk upgrade
RUN apk add file gcc m4
RUN apk add -U --repository http://dl-cdn.alpinelinux.org/alpine/edge/testing aufs-util
# Install the latest v1 of box-js
RUN npm install box-js@"^1.0.0" --global --production
WORKDIR /samples
CMD box-js /samples --output-dir=/samples --loglevel=debug
