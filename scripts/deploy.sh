#!/bin/bash

# SavoryBalance AI - Deployment Script
# Run with: bash scripts/deploy.sh

echo "🚀 SavoryBalance AI Deployment Script"
echo "======================================"

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js >= 16"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Backend installation failed"
    exit 1
fi
cd ..

# Test backend
echo "🧪 Testing backend..."
cd backend
npm test &
BACKEND_PID=$!
sleep 3

# Check if backend is running
if curl -s http://localhost:5000/health | grep -q "Running"; then
    echo "✅ Backend is working correctly"
else
    echo "❌ Backend test failed"
    kill $BACKEND_PID
    exit 1
fi

kill $BACKEND_PID
cd ..

echo ""
echo "📊 Deployment Options:"
echo "1. Local Development"
echo "2. Deploy to Vercel (Frontend) + Render (Backend)"
echo "3. Full GitHub Deployment"
echo ""
read -p "Choose option (1-3): " option

case $option in
    1)
        echo "🏃 Starting local development..."
        echo "Open TWO terminals:"
        echo ""
        echo "Terminal 1 (Backend):"
        echo "  cd backend"
        echo "  npm start"
        echo ""
        echo "Terminal 2 (Frontend):"
        echo "  cd frontend"
        echo "  npx live-server"
        echo ""
        echo "Then open: http://localhost:8080"
        ;;
    2)
        echo "🌐 Deploying to production..."
        echo ""
        echo "Step 1: Push to GitHub:"
        echo "  git init"
        echo "  git add ."
        echo "  git commit -m 'Initial commit'"
        echo "  git remote add origin YOUR_GITHUB_URL"
        echo "  git push -u origin main"
        echo ""
        echo "Step 2: Deploy Frontend to Vercel:"
        echo "  - Go to vercel.com"
        echo "  - Import from GitHub"
        echo "  - Select /frontend folder"
        echo "  - Deploy"
        echo ""
        echo "Step 3: Deploy Backend to Render:"
        echo "  - Go to render.com"
        echo "  - New Web Service"
        echo "  - Connect GitHub repo"
        echo "  - Build: npm install"
        echo "  - Start: node server.js"
        echo "  - Get backend URL"
        echo ""
        echo "Step 4: Update frontend fetch URL in index.html"
        ;;
    3)
        echo "📦 Creating deployment package..."
        zip -r savorybalance-ai.zip . -x "*.git*" "node_modules/*" ".env"
        echo "✅ Package created: savorybalance-ai.zip"
        echo ""
        echo "Upload this to your hackathon submission!"
        ;;
    *)
        echo "❌ Invalid option"
        ;;
esac

echo ""
echo "🎉 SavoryBalance AI is ready!"
echo "Happy coding! 🍎"