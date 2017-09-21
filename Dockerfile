FROM node:alpine

# Install base packages
RUN apk update
RUN apk upgrade
RUN apk add ca-certificates && update-ca-certificates

# Change TimeZone
RUN apk add --update tzdata
ENV TZ=America/New_York

# Clean APK cache
RUN rm -rf /var/cache/apk/*

#create app directory
WORKDIR /usr/src/ezproxy-libpharos

# Install app dependencies
COPY package.json .

RUN npm install

# Bundle app source
COPY . .

EXPOSE 3000
CMD ["npm", "start"]