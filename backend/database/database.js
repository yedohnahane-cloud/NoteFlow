const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "noteflow.db");
const db = new Database(dbPath);

// Configuration des performances et de l'intégrité référentielle
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Table des utilisateurs
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Table des notes
db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT DEFAULT 'Général',
        is_pinned INTEGER DEFAULT 0,
        is_archived INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
`);

// Ajout des colonnes si la table existait déjà avec un schéma réduit
const existingColumns = db.prepare("PRAGMA table_info(notes)").all().map(c => c.name);
if (!existingColumns.includes("category")) {
    db.exec("ALTER TABLE notes ADD COLUMN category TEXT DEFAULT 'Général'");
}
if (!existingColumns.includes("is_pinned")) {
    db.exec("ALTER TABLE notes ADD COLUMN is_pinned INTEGER DEFAULT 0");
}
if (!existingColumns.includes("is_archived")) {
    db.exec("ALTER TABLE notes ADD COLUMN is_archived INTEGER DEFAULT 0");
}

// Table des tags
db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#6366f1',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
`);

// Table de liaison Notes <-> Tags (Many-to-Many)
db.exec(`
    CREATE TABLE IF NOT EXISTS note_tags (
        note_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (note_id, tag_id),
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
`);

// Table des liens entre notes (Knowledge Graph)
db.exec(`
    CREATE TABLE IF NOT EXISTS note_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        source_note_id INTEGER NOT NULL,
        target_note_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, source_note_id, target_note_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (source_note_id) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY (target_note_id) REFERENCES notes(id) ON DELETE CASCADE
    )
`);

// Table des versions de notes (Historique & Versioning)
db.exec(`
    CREATE TABLE IF NOT EXISTS note_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        note_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
`);

// Table des favoris
db.exec(`
    CREATE TABLE IF NOT EXISTS favorites (
        user_id INTEGER NOT NULL,
        note_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, note_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    )
`);

// Index d'optimisation
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
    CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
    CREATE INDEX IF NOT EXISTS idx_note_versions_note_id ON note_versions(note_id);
    CREATE INDEX IF NOT EXISTS idx_note_links_user_id ON note_links(user_id);
`);

console.log("Base de données NoteFlow connectée et schémas synchronisés avec succès !");

module.exports = db;