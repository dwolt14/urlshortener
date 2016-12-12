#Use official node image as base
FROM node:7-slim

MAINTAINER Dennis Wolters

#Tell node that this is a production environment (dev dependencies will be ommited)
ENV NODE_ENV production

#Create and set the working directory
RUN mkdir /var/www
WORKDIR /var/www/

#Copy all files to the working directory, except those excluded by .dockerignore
COPY ./ /var/www/

#Get all dependencies
RUN npm install

#Expose the port of the web server
EXPOSE 3000

#Define the data directory as a volume so that the data is not stored within the container
VOLUME ["/var/www/data"]

#Upon container initialization start the web server
CMD ["npm", "start"]