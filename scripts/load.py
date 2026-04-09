import os
import snowflake.connector
from dotenv import load_dotenv

load_dotenv()

def load_to_snowflake():
    conn = snowflake.connector.connect(
        user=os.getenv('SNOWFLAKE_USER'),
        password=os.getenv('SNOWFLAKE_PASSWORD'),
        account=os.getenv('SNOWFLAKE_ACCOUNT'),
        warehouse='COMPUTE_WH',
        database='STRAVA_DB',
        schema='RAW'
    )
    
    cursor = conn.cursor()
    
    try:
        print("Uploading local JSON to Snowflake stage...")
        cursor.execute("PUT file://data/raw_activities.json @strava_stage OVERWRITE=TRUE")
        print("Copying data from stage into activities_raw table...")
        cursor.execute("""
            COPY INTO activities_raw (raw_json)
            FROM @strava_stage/raw_activities.json
            FILE_FORMAT = (FORMAT_NAME = 'json_format')
            ON_ERROR = 'CONTINUE'
        """)
        
        print("\n--- SUCCESS ---")
        print("Data is now sitting in Snowflake!")
        
    except Exception as e:
        print(f"Error: {e}")
        
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    load_to_snowflake()