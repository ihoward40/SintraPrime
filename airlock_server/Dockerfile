FROM node:20-alpine
USER node
WORKDIR /app
COPY --chown=node:node airlock_server/package*.json ./
RUN npm ci --only=production
COPY --chown=node:node airlock_server/ ./

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

EXPOSE 3000
CMD ["npm", "start"]
