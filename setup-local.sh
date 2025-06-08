
#!/bin/bash

echo "🚀 Setting up QualityBytes for local development..."

# Create .env file from template if it doesn't exist
if [ ! -f .env ]; then
    echo "📋 Creating .env file from template..."
    cp .env.example .env
    echo "✅ Please edit .env file with your database credentials"
else
    echo "✅ .env file already exists"
fi

# Build and start the services
echo "🐳 Building and starting Docker containers..."
docker-compose -f docker-compose.dev.yml up --build -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "🗃️ Running database migrations..."
docker-compose -f docker-compose.dev.yml exec app npm run db:push

echo "✅ Setup complete!"
echo "🌐 Application is running at: http://localhost:5000"
echo "🗃️ Database is running at: localhost:5432"
echo ""
echo "To stop the application: docker-compose -f docker-compose.dev.yml down"
echo "To view logs: docker-compose -f docker-compose.dev.yml logs -f"
