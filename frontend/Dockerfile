# Use a Node image for building the React/Vite app
FROM node:18 as builder

WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your frontend code
COPY . .

# Build the production version of the app (if you want to serve static files)
RUN npm run build

# For production, use a simple static file server
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]