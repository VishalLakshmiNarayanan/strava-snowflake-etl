SELECT 
    DATE_TRUNC('MONTH', ACTIVITY_DATE) as training_month,
    ROUND(SUM(DISTANCE_KM), 2) as total_monthly_km,
    ROUND(AVG(PACE_MIN_KM), 2) as avg_monthly_pace_decimal,
    CONCAT(
        FLOOR(AVG(PACE_MIN_KM)), ':', 
        LPAD(ROUND((AVG(PACE_MIN_KM) - FLOOR(AVG(PACE_MIN_KM))) * 60), 2, '0')
    ) as avg_pace_formatted
FROM strava_db.raw.v_activities_transformed
WHERE ACTIVITY_TYPE = 'Run'
GROUP BY 1
ORDER BY 1 DESC;