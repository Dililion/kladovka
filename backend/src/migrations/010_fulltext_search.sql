-- Add tsvector column for full-text search
ALTER TABLE articles ADD COLUMN search_vector tsvector;

-- Create index for full-text search (using Russian language support)
CREATE INDEX idx_articles_search_vector ON articles USING GIN(search_vector);

-- Create function to update search_vector
CREATE OR REPLACE FUNCTION articles_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('russian', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('russian', coalesce(NEW.content, '')), 'B') ||
    setweight(to_tsvector('russian', coalesce(NEW.excerpt, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update search_vector on insert/update
CREATE TRIGGER articles_search_vector_trigger
BEFORE INSERT OR UPDATE ON articles
FOR EACH ROW EXECUTE FUNCTION articles_search_vector_update();

-- Update existing articles
UPDATE articles SET search_vector =
  setweight(to_tsvector('russian', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('russian', coalesce(content, '')), 'B') ||
  setweight(to_tsvector('russian', coalesce(excerpt, '')), 'C');
