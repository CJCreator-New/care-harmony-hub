#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: ./rollback.sh <backup_file>"
  exit 1
fi

BACKUP_FILE=$1

echo "⚠️  Starting rollback to $BACKUP_FILE"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Rollback cancelled"
  exit 0
fi

# Stop application
echo "Stopping application..."
pm2 stop caresync

# Restore database
if [[ $BACKUP_FILE == *.gz ]]; then
  gunzip -c $BACKUP_FILE | psql $DATABASE_URL
else
  psql $DATABASE_URL < $BACKUP_FILE
fi

if [ $? -eq 0 ]; then
  echo "✅ Database restored"
  
  # Restart application
  pm2 start caresync
  echo "✅ Application restarted"
  
  echo "✅ Rollback completed successfully"
  exit 0
else
  echo "❌ Rollback failed"
  pm2 start caresync
  exit 1
fi
