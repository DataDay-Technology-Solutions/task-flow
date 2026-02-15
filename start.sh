#!/bin/bash

# Task Flow - Startup Script
# Starts both backend and frontend servers

echo "🚀 Starting Task Flow..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if node_modules exist, if not install
if [ ! -d "$DIR/backend/node_modules" ]; then
    echo -e "${BLUE}Installing backend dependencies...${NC}"
    cd "$DIR/backend" && npm install
fi

if [ ! -d "$DIR/frontend/node_modules" ]; then
    echo -e "${BLUE}Installing frontend dependencies...${NC}"
    cd "$DIR/frontend" && npm install
fi

echo ""
echo -e "${GREEN}Starting Backend API on http://localhost:3109${NC}"
cd "$DIR/backend" && npm start &
BACKEND_PID=$!

sleep 2

echo -e "${GREEN}Starting Frontend on http://localhost:3009${NC}"
cd "$DIR/frontend" && PORT=3009 npm start &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}✓ Task Flow is running!${NC}"
echo ""
echo "  Frontend: http://localhost:3009"
echo "  Backend:  http://localhost:3109"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
