ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_document_expiry DATE;
CREATE TABLE IF NOT EXISTS kyc_expiry_notifications (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_date DATE NOT NULL,
  PRIMARY KEY (user_id, notification_date)
);
