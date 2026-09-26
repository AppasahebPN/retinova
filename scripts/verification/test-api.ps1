$loginBody = '{"email":"asha.worker@netra-ai.org","password":"demo1234"}'
$loginRes = Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/login' -Method Post -Body $loginBody -ContentType 'application/json'
$headers = @{ Authorization = "Bearer $($loginRes.token)" }

Write-Host "=== PATIENT ==="
$pat = (Invoke-RestMethod -Uri 'http://localhost:5000/api/patients?limit=1' -Headers $headers).patients[0]
$pat | ConvertTo-Json -Depth 3

Write-Host "`n=== SCREENING ==="
$scr = (Invoke-RestMethod -Uri 'http://localhost:5000/api/screenings?limit=1' -Headers $headers).screenings[0]
$scr | ConvertTo-Json -Depth 5
