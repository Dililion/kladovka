-- Add parent_id for hierarchy
ALTER TABLE articles ADD COLUMN parent_id INTEGER REFERENCES articles(id) ON DELETE CASCADE;

-- Add is_private flag
ALTER TABLE articles ADD COLUMN is_private BOOLEAN DEFAULT false NOT NULL;

-- Drop comments table (not needed for wiki)
DROP TABLE IF EXISTS comments;

-- Add index for tree queries
CREATE INDEX idx_articles_parent_id ON articles(parent_id);
