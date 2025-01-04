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
    m1   INTEGER (1) DEFAULT 0,
    m2   INTEGER (1) DEFAULT 0,
    m3   INTEGER (1) DEFAULT 0,
    t1   INTEGER (1) DEFAULT 0,
    t2   INTEGER (1) DEFAULT 0,
    t3   INTEGER (1) DEFAULT 0,
    w1   INTEGER (1) DEFAULT 0,
    w2   INTEGER (1) DEFAULT 0,
    w3   INTEGER (1) DEFAULT 0,
    h1   INTEGER (1) DEFAULT 0,
    h2   INTEGER (1) DEFAULT 0,
    h3   INTEGER (1) DEFAULT 0,
    f1   INTEGER (1) DEFAULT 0,
    f2   INTEGER (1) DEFAULT 0,
    f3   INTEGER (1) DEFAULT 0,
    s1   INTEGER (1) DEFAULT 0,
    s2   INTEGER (1) DEFAULT 0,
    s3   INTEGER (1) DEFAULT 0,
    u1   INTEGER (1) DEFAULT 0,
    u2   INTEGER (1) DEFAULT 0,
    u3   INTEGER (1) DEFAULT 0
);
```
