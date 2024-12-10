# FROM node:18-alpine AS deps
# WORKDIR /app

# # Copy only the files needed to install dependencies
# COPY package.json pnpm-lock.yaml* ./

# # Install dependencies for native module builds
# RUN apk update && apk add --no-cache python3 py3-pip build-base gcc

# # Install dependencies with the preferred package manager
# RUN corepack enable pnpm && pnpm i --frozen-lockfile

# FROM node:18-alpine AS builder
# WORKDIR /app

# COPY --from=deps /app/node_modules ./node_modules

# # Copy the rest of the files
# COPY . .

# # Run build with the preferred package manager
# RUN corepack enable pnpm && pnpm build

# # Set NODE_ENV environment variable
# ENV NODE_ENV production

# # Re-run install only for production dependencies
# RUN corepack enable pnpm && pnpm i --frozen-lockfile --prod

# FROM node:18-alpine AS runner
# WORKDIR /app

# # Create the logs directory and give ownership to the node user
# RUN mkdir -p /app/logs && chown -R node:node /app

# # Copy the bundled code from the builder stage
# COPY --from=builder --chown=node:node /app/dist ./dist
# COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# # Use the node user from the image
# USER node

# # Expose application port (optional, specify the port your app uses)
# EXPOSE 9000

# # Start the server
# CMD ["node", "dist/src/main.js"]

#===========================================================================================

# Use the official Node.js 18 image as a base image
FROM node:18

# Install pnpm globally
RUN npm install -g pnpm

# Install pnpm globally
RUN npm install -g nodemon

# Set the working directory
WORKDIR /src

# Copy package.json and pnpm-lock.yaml to the working directory
COPY package.json .
COPY pnpm-lock.yaml .

# Install project dependencies
RUN pnpm install

# Copy the rest of the application code
COPY . .


EXPOSE 9000

# Specify the default command to run your application
CMD ["pnpm", "start:dev"]