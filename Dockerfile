FROM node:21-slim
WORKDIR /app
COPY package.json ./
RUN npm install
RUN npx playwright install --with-deps
COPY . .
EXPOSE 5000
CMD [ "npm", "start" ]