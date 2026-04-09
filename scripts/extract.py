import os
import json
import requests
from dotenv import load_dotenv

# Load variables from .env
load_dotenv()

def extract_activities():
    # 1. Setup
    url = "https://www.strava.com/api/v3/athlete/activities"
    access_token = os.getenv('STRAVA_ACCESS_TOKEN')
    
    headers = {
        'Authorization': f'Bearer {access_token}'
    }
    
    # pull the last 100 activities 
    params = {
        'per_page': 100,
        'page': 1
    }

    print("Fetching data from Strava API...")
    
    # 2. Execute Request
    response = requests.get(url, headers=headers, params=params)

    # 3. Handle Results
    if response.status_code == 200:
        activities = response.json()
        
        # Define file path
        file_path = os.path.join('data', 'raw_activities.json')
        
        # Save JSON to local data folder
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(activities, f, ensure_ascii=False, indent=4)
            
        print(f"Success! Extracted {len(activities)} activities to {file_path}")
    
    elif response.status_code == 401:
        print("Error: Access Token expired. You'll need to run the refresh script next!")
    else:
        print(f"Failed to fetch data. Status code: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    extract_activities()