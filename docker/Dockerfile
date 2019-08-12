FROM node:10

COPY files /var/entrymanager
RUN cd /var/entrymanager; npm install

CMD ["node", "/var/entrymanager/app.js"]

