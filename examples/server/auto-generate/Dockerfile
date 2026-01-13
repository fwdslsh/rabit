FROM nginx:alpine

# Install bash and jq for manifest generation
RUN apk add --no-cache bash jq

# Copy the generator script
COPY generate-burrow.sh /usr/local/bin/generate-burrow.sh
RUN chmod +x /usr/local/bin/generate-burrow.sh

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create data directory
RUN mkdir -p /data

# Expose port
EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
