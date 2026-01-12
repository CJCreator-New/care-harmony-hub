#!/bin/bash

BACKUP_DIR="/backups/caresync"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"
RETENTION_DAYS=30

echo "Starting backup at $(date)"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump $DATABASE_URL > $BACKUP_FILE

if [ $? -eq 0 ]; then
  echo "✅ Database backup created: $BACKUP_FILE"
  
  # Compress backup
  gzip $BACKUP_FILE
  echo "✅ Backup compressed"
  
  # Upload to cloud storage (optional)
  if [ ! -z "$AWS_S3_BUCKET" ]; then
    aws s3 cp ${BACKUP_FILE}.gz s3://$AWS_S3_BUCKET/backups/
    echo "✅ Backup uploaded to S3"
  fi
  
  # Remove old backups
  find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
  echo "✅ Old backups cleaned up"
  
  echo "✅ Backup completed successfully"
  exit 0
else
  echo "❌ Backup failed"
  exit 1
fi
