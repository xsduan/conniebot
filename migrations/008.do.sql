ALTER TABLE messageAuthors
ADD COLUMN createdAt NUMERIC NOT NULL DEFAULT (unixepoch("now"));
