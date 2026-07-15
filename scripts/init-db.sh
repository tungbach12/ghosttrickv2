#!/bin/bash
# Wait for API to create tables
echo "Waiting for API to create tables..."
sleep 30

# Run the init.sql
echo "Running init.sql..."
psql -U postgres -d GhostTrickDb -f /docker-entrypoint-initdb.d/init.sql

echo "Database initialization complete!"
