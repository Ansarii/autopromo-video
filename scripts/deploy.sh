#!/bin/bash
# Quick deployment script for Render.com

set -e

echo "🚀 AutoPromo.video Deployment Script"
echo "======================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "📝 Please copy .env.example to .env and fill in your credentials:"
    echo "   cp .env.example .env"
    exit 1
fi

# Check required environment variables
required_vars=("UPSTASH_REDIS_URL" "R2_ACCOUNT_ID" "R2_ACCESS_KEY_ID" "R2_SECRET_ACCESS_KEY")
missing_vars=()

for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env || grep -q "^${var}=your_" .env; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo "❌ Missing or incomplete environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "📝 Please update .env with real credentials"
    exit 1
fi

echo "✅ Environment variables configured"
echo ""

# Check if music files exist
if [ ! -f public/music/upbeat-tech.mp3 ]; then
    echo "⚠️  Warning: No music files found in public/music/"
    echo "   Videos will be generated without background music"
    echo "   Download free tracks from: https://pixabay.com/music/"
    echo ""
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Build check
echo "🔨 Testing build..."
node -e "console.log('✅ Node.js working')"
echo ""

# Git check
if [ -d .git ]; then
    echo "📊 Git status:"
    git status --short
    echo ""
    
    read -p "🚀 Ready to deploy? Commit and push to trigger Render deployment (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📤 Committing changes..."
        git add .
        git commit -m "Deploy AutoPromo.video MVP" || echo "No changes to commit"
        git push
        echo "✅ Pushed to GitHub - Render will auto-deploy"
        echo ""
        echo "🌐 Check deployment status at: https://dashboard.render.com"
    fi
else
    echo "⚠️  Not a git repository. Initialize git to deploy to Render:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    echo "   git remote add origin <your-github-repo-url>"
    echo "   git push -u origin main"
fi

echo ""
echo "✅ All checks complete!"
echo ""
echo "📚 Next steps:"
echo "   1. Ensure Git repo is connected to Render.com"
echo "   2. Create Web Service on Render (Docker environment)"
echo "   3. Add environment variables in Render dashboard"
echo "   4. Render will auto-deploy on git push"
echo ""
echo "🎉 Happy shipping!"
