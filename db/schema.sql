-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    customer TEXT,
    address TEXT,
    city TEXT,
    contact TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'draft',
    systems JSONB DEFAULT '[]'::jsonb,
    analysis JSONB,
    estimates JSONB,
    markups JSONB,
    outputs JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    storage_path TEXT,
    file_type TEXT,
    size_bytes BIGINT,
    vision_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project Outputs Table (for reports, etc.)
CREATE TABLE IF NOT EXISTS project_outputs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    type TEXT,
    content JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);

-- SAFETY GRID: Ensure columns exist even if table was already created
ALTER TABLE projects ADD COLUMN IF NOT EXISTS systems JSONB DEFAULT '[]'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS analysis JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimates JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS markups JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS outputs JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS vision_data JSONB;

-- Disable RLS to ensure server can write without specific policies
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_outputs DISABLE ROW LEVEL SECURITY;

-- Force PostgREST to refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Remove NOT NULL constraint from user_id (since app doesn't send it yet)
ALTER TABLE projects ALTER COLUMN user_id DROP NOT NULL;
