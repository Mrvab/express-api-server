#!/bin/bash

# Create necessary directories
mkdir -p nginx/conf.d nginx/certs nginx/logs

# Wait for databases to be ready
wait_for_service() {
    echo "Waiting for $1..."
    until nc -z $2 $3; do
        sleep 1
    done
    echo "$1 is ready!"
}

# Initialize DynamoDB tables
init_dynamodb() {
    echo "Initializing DynamoDB tables..."
    aws dynamodb create-table \
        --endpoint-url http://localhost:8000 \
        --table-name Users \
        --attribute-definitions AttributeName=id,AttributeType=S \
        --key-schema AttributeName=id,KeyType=HASH \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --region us-east-1
}

# Main initialization
echo "Starting services initialization..."

# Start services
docker-compose up -d

# Wait for services to be ready
wait_for_service "MongoDB" "localhost" "27017"
wait_for_service "MySQL" "localhost" "3306"
wait_for_service "DynamoDB" "localhost" "8000"

# Initialize DynamoDB
init_dynamodb

echo "All services are initialized and ready!" 