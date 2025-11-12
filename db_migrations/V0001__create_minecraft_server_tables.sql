CREATE TABLE IF NOT EXISTS minecraft_servers (
  id SERIAL PRIMARY KEY,
  server_name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  port INTEGER NOT NULL,
  max_players INTEGER DEFAULT 20,
  gamemode VARCHAR(50) DEFAULT 'survival',
  difficulty VARCHAR(50) DEFAULT 'normal',
  status VARCHAR(50) DEFAULT 'stopped',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS server_databases (
  id SERIAL PRIMARY KEY,
  server_id INTEGER REFERENCES minecraft_servers(id),
  db_name VARCHAR(255) NOT NULL,
  db_size VARCHAR(50) DEFAULT '0 MB',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS server_files (
  id SERIAL PRIMARY KEY,
  server_id INTEGER REFERENCES minecraft_servers(id),
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size VARCHAR(50) DEFAULT '0 KB',
  file_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);