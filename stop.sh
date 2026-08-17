#!/bin/bash

echo "🛑 Stopping Knowledge Base application..."

docker-compose down

echo ""
echo "✅ Application stopped successfully!"
echo ""
echo "To remove volumes (database data), run: docker-compose down -v"
echo ""
