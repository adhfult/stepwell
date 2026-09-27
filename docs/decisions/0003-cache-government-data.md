# 0003: Cache government data in our database

- Status: accepted

## Context
O*NET and College Scorecard APIs are free but rate-limited, and the core
feature needs to join careers, programs, and colleges.

## Decision
Scheduled import jobs copy the needed data into Supabase tables. Pages only
read our tables. Each row keeps its source and retrieval date.

## Consequences
Fast pages and joins across datasets. Data can be up to a month old, which is
fine for this use. Import jobs need their own secrets and monitoring.
