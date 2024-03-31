FROM node:18.19-alpine

WORKDIR /app

COPY package.json /app

RUN npm install

COPY . /app

EXPOSE 3001
RUN echo "Node: " && node -v
RUN chmod +x run.sh
ENTRYPOINT [ "./run.sh" ]
# CMD ["npm", "run", "dev"]
