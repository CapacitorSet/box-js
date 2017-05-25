FROM mhart/alpine-node:latest
RUN apk add --no-cache git file
RUN git clone https://github.com/CapacitorSet/box-js /usr/share/boxjs;\
cd /usr/share/boxjs; npm install;
ENTRYPOINT ["/bin/sh"]
