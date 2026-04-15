SELECT 
    ACTIVITY_NAME,
    ACTIVITY_DATE,
    DISTANCE_KM,
    FLOOR(PACE_MIN_KM) as minutes,
    ROUND((PACE_MIN_KM - minutes) * 60) as seconds,
    CONCAT(minutes, ':', LPAD(seconds, 2, '0')) as pace,
    
    RANK() OVER(ORDER BY PACE_MIN_KM ASC) as p_rank
FROM strava_db.raw.v_activities_transformed
WHERE ACTIVITY_TYPE = 'Run'
  AND DISTANCE_KM BETWEEN 4.9 AND 5.2
QUALIFY p_rank <= 5;