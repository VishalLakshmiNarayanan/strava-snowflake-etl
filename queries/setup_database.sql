-- the project database
CREATE DATABASE IF NOT EXISTS strava_db;

-- schema for raw ingestion
CREATE SCHEMA IF NOT EXISTS strava_db.raw;

USE DATABASE strava_db;
USE SCHEMA raw;

-- File Format 
CREATE OR REPLACE FILE FORMAT strava_db.raw.json_format
  TYPE = 'JSON'
  STRIP_OUTER_ARRAY = TRUE;

-- Internal Stage
CREATE OR REPLACE STAGE strava_db.raw.strava_stage;

-- Raw Table
CREATE OR REPLACE TABLE strava_db.raw.activities_raw (
    raw_json VARIANT,
    inserted_at TIMESTAMP_LTZ DEFAULT CURRENT_TIMESTAMP()
);
