# Deploying CRM to Hostinger VPS

**Domain:** `libconsulting-thai.cloud`

## Prerequisites

- Hostinger VPS with Ubuntu 22.04+ (or Debian 12+)
- SSH access to the VPS
- Domain DNS pointing to the VPS IP address

## Step 1: Point DNS to Your VPS

In Hostinger's DNS settings, change the nameservers or add these records:

| Type | Name | Value                |
| ---- | ---- | -------------------- |
| A    | @    | `YOUR_VPS_IP_ADDRESS` |
| A    | www  | `YOUR_VPS_IP_ADDRESS` |

> You can find your VPS IP in the Hostinger panel under **VPS > Overview**.
> DNS changes can take up to 24 hours to propagate.

## Step 2: SSH Into Your VPS

```bash
ssh root@YOUR_VPS_IP_ADDRESS
```

## Step 3: Run the Setup Script

```bash
# Clone the repo
git clone https://github.com/bihu19/existing_project.git /tmp/crm-setup
cd /tmp/crm-setup/crm

# Run the automated setup
sudo bash deploy/setup.sh
```

This script will:
1. Install Node.js 20, nginx, PM2, and certbot
2. Clone the app to `/var/www/crm`
3. Build the Next.js app
4. Set up nginx reverse proxy
5. Obtain a free SSL certificate (Let's Encrypt)
6. Start the app with PM2 (auto-restarts on crash/reboot)

## Step 4: Create Your Admin User

```bash
cd /var/www/crm
npm run create-admin
```

## Step 5: Visit Your Site

Open **https://libconsulting-thai.cloud** and log in.

---

## Useful Commands

```bash
pm2 status          # Check if the app is running
pm2 logs crm        # View app logs
pm2 restart crm     # Restart after changes

cd /var/www/crm
npm run db:studio    # Visual database editor (localhost:5555)
```

## Updating the App

```bash
cd /var/www/crm
git pull origin main
npm ci
npx prisma db push
npm run build
pm2 restart crm
```
