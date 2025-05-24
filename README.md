# ListGenABA
Created by @oivas000. A Python script to generate a schedule from a sqliteDB for a custom purpose.

## Database Schema (DDL)
```
CREATE TABLE ABA (
    No   INTEGER     PRIMARY KEY
                     UNIQUE
                     NOT NULL,
    NAME TEXT        NOT NULL,
    B    INTEGER     NOT NULL
                     DEFAULT (100),
    R    INTEGER     NOT NULL
                     DEFAULT (100),
    I    INTEGER     NOT NULL
                     DEFAULT (100),
    m1   INTEGER (1) DEFAULT 0
                     NOT NULL,
    m2   INTEGER (1) DEFAULT 0
                     NOT NULL,
    m3   INTEGER (1) DEFAULT 0
                     NOT NULL,
    t1   INTEGER (1) DEFAULT 0
                     NOT NULL,
    t2   INTEGER (1) DEFAULT 0
                     NOT NULL,
    t3   INTEGER (1) DEFAULT 0
                     NOT NULL,
    w1   INTEGER (1) DEFAULT 0
                     NOT NULL,
    w2   INTEGER (1) DEFAULT 0
                     NOT NULL,
    w3   INTEGER (1) DEFAULT 0
                     NOT NULL,
    h1   INTEGER (1) DEFAULT 0
                     NOT NULL,
    h2   INTEGER (1) DEFAULT 0
                     NOT NULL,
    h3   INTEGER (1) DEFAULT 0
                     NOT NULL,
    f1   INTEGER (1) DEFAULT 0
                     NOT NULL,
    f2   INTEGER (1) DEFAULT 0
                     NOT NULL,
    f3   INTEGER (1) DEFAULT 0
                     NOT NULL,
    s1   INTEGER (1) DEFAULT 0
                     NOT NULL,
    s2   INTEGER (1) DEFAULT 0
                     NOT NULL,
    s3   INTEGER (1) DEFAULT 0
                     NOT NULL,
    u1   INTEGER (1) DEFAULT 0
                     NOT NULL,
    u2   INTEGER (1) DEFAULT 0
                     NOT NULL,
    u3   INTEGER (1) DEFAULT 0
                     NOT NULL
);
```
