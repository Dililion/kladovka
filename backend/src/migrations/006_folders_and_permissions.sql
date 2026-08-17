ALTER TABLE articles ADD COLUMN is_folder BOOLEAN DEFAULT false NOT NULL;

CREATE TABLE article_permissions (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(article_id, user_id)
);

CREATE INDEX idx_article_permissions_article ON article_permissions(article_id);
CREATE INDEX idx_article_permissions_user ON article_permissions(user_id);
