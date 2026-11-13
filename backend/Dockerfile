FROM node:20-bookworm-slim
WORKDIR /app/backend
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src
COPY openapi.yaml ./openapi.yaml
EXPOSE 3000
CMD ["node", "src/server.js"]
