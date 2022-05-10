BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS oldMessageAuthors (
    message TEXT PRIMARY KEY,
    author TEXT,
    original TEXT,
    shouldEdit INTEGER NOT NULL DEFAULT TRUE
);

INSERT INTO oldMessageAuthors
SELECT * FROM messageAuthors;

DROP TABLE messageAuthors;

ALTER TABLE oldMessageAuthors
RENAME TO messageAuthors;

COMMIT;
