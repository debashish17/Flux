-- Flux Database Initialization Script
-- Run this in your Supabase SQL Editor

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('docx', 'pptx')),
    prompt TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- Create document_sections table
CREATE TABLE IF NOT EXISTS document_sections (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    order_index INTEGER NOT NULL,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_document_sections_project_id ON document_sections(project_id);

-- Create refinement_history table
CREATE TABLE IF NOT EXISTS refinement_history (
    id SERIAL PRIMARY KEY,
    section_id INTEGER NOT NULL REFERENCES document_sections(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    previous_content TEXT NOT NULL,
    new_content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refinement_history_section_id ON refinement_history(section_id);

-- Verify tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
