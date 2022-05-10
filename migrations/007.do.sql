BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS newMessageAuthors (
    message INTEGER PRIMARY KEY,
    author INTEGER NOT NULL,
    original INTEGER NOT NULL,
    shouldEdit INTEGER NOT NULL
);

INSERT INTO newMessageAuthors
SELECT * FROM messageAuthors
WHERE message IS NOT NULL AND author IS NOT NULL AND original IS NOT NULL;

DROP TABLE messageAuthors;

ALTER TABLE newMessageAuthors
RENAME TO messageAuthors;

COMMIT;
