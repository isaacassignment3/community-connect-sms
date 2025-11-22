/*
  # Create SMS Templates Table

  1. New Tables
    - `sms_templates`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Template name
      - `content` (text) - Template message content
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `sms_templates` table
    - Add policy for public to read templates
    - Add policy for public to insert templates
    - Add policy for public to update templates
    - Add policy for public to delete templates
*/

CREATE TABLE IF NOT EXISTS sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view templates"
  ON sms_templates FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert templates"
  ON sms_templates FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update templates"
  ON sms_templates FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Anyone can delete templates"
  ON sms_templates FOR DELETE
  TO public
  USING (true);