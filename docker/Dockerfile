FROM node:10

COPY files/entrymanager /var/entrymanager
RUN cd /var/entrymanager; npm install

EXPOSE 1080/tcp
CMD ["node", "/var/entrymanager/app.js"]

