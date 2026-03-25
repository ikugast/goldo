#!/bin/bash
# setup.sh

echo "========================================="
echo "   Gold Bean Sprout v7 - Deployment      "
echo "========================================="

# 1. Update and install dependencies
echo "[1/4] Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv nginx

# 2. Setup Python virtual environment
echo "[2/4] Setting up Python virtual environment..."
cd "$(dirname "$0")"
PROJECT_ROOT=$(pwd)

python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# 3. Prompt for Environment Variables
echo "[3/4] Configuring Environment Variables..."
ENV_FILE="$PROJECT_ROOT/backend/.env"

if [ ! -f "$ENV_FILE" ]; then
    cp backend/.env.example "$ENV_FILE"
fi

echo "Please enter your API Keys and Configuration:"
read -p "Enter ARK_API_KEY_PRO: " ark_pro
read -p "Enter ARK_API_KEY_LITE: " ark_lite
read -p "Enter ADMIN_PASSWORD: " admin_pwd

sed -i "s/your_ark_api_key_pro_here/$ark_pro/" "$ENV_FILE"
sed -i "s/your_ark_api_key_lite_here/$ark_lite/" "$ENV_FILE"
sed -i "s/your_admin_password_here/$admin_pwd/" "$ENV_FILE"

# 4. Setup Systemd Service
echo "[4/4] Configuring Systemd and Nginx..."
SERVICE_FILE="/etc/systemd/system/gold-bean-sprout.service"
sudo cp gold-bean-sprout.service $SERVICE_FILE

# Fix paths in systemd service to match actual location
sudo sed -i "s|/root/gold-bean-sprout-v7|$PROJECT_ROOT|g" $SERVICE_FILE
sudo systemctl daemon-reload
sudo systemctl enable gold-bean-sprout
sudo systemctl restart gold-bean-sprout

# 5. Setup Nginx
NGINX_CONF="/etc/nginx/sites-available/gold-bean-sprout"
sudo cp nginx_conf $NGINX_CONF
sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl restart nginx

echo "========================================="
echo " Deployment Complete! "
echo " Please configure your server firewall to allow port 80."
echo "========================================="
