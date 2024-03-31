FROM node:18.17-alpine

# Set working directory
WORKDIR /temp

RUN npm config set strict-ssl false
RUN npm config set registry http://registry.npmjs.org/

# Copy all files
COPY . .

RUN npm install

CMD [ "npm", "run", "dev" ]
