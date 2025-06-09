# Use Node.js 20 LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Clear npm cache and install dependencies
RUN npm cache clean --force && npm ci

RUN npm install vite@5.4.14 --save-dev --legacy-peer-deps

# Copy source code
COPY . .

# Build argument for Stripe public key (needed at build time)
ARG VITE_STRIPE_PUBLIC_KEY
ENV VITE_STRIPE_PUBLIC_KEY=$VITE_STRIPE_PUBLIC_KEY

# Debug: Check what's installed and add to PATH
RUN ls -la node_modules/.bin/ || echo "node_modules/.bin/ not found"
ENV PATH="/app/node_modules/.bin:$PATH"

# Build the application 
RUN vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 5000

# Set environment variables
# ENV NODE_ENV=production
ENV PORT=5000

# Start the application
CMD ["npm", "start"]