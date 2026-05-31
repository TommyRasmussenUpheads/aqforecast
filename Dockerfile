FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY index.js .
COPY db.js .
COPY historical.js .
COPY public ./public
EXPOSE 3000
CMD ["node", "index.js"]
