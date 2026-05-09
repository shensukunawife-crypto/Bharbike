#!/bin/bash

# BharBike Backend - Deployment Verification Script
# Usage: ./verify-deployment.sh https://your-service-name.onrender.com

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if URL is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Please provide the backend URL${NC}"
    echo "Usage: ./verify-deployment.sh https://your-service-name.onrender.com"
    exit 1
fi

BACKEND_URL=$1
echo -e "${YELLOW}Testing BharBike Backend at: ${BACKEND_URL}${NC}\n"

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local expected=$2
    local method=${3:-GET}
    
    echo -n "Testing ${endpoint}... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}${endpoint}")
    fi
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $response)"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $response)"
        return 1
    fi
}

# Test counter
passed=0
failed=0

echo "=== Basic Health Checks ==="

# Test 1: Health endpoint
if test_endpoint "/health" "OK"; then
    ((passed++))
else
    ((failed++))
fi

# Test 2: Root endpoint
if test_endpoint "/" "Backend running"; then
    ((passed++))
else
    ((failed++))
fi

echo ""
echo "=== API Endpoints ==="

# Test 3: Orders endpoint
if test_endpoint "/api/orders" ""; then
    ((passed++))
else
    ((failed++))
fi

# Test 4: Bikes endpoint
if test_endpoint "/api/bikes" ""; then
    ((passed++))
else
    ((failed++))
fi

# Test 5: Deliveries endpoint
if test_endpoint "/api/deliveries" ""; then
    ((passed++))
else
    ((failed++))
fi

echo ""
echo "=== Results ==="
echo -e "Passed: ${GREEN}${passed}${NC}"
echo -e "Failed: ${RED}${failed}${NC}"

if [ $failed -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Backend is working correctly.${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  Some tests failed. Please check the logs.${NC}"
    exit 1
fi
