$body = '{"amount":100}'
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)

Write-Host "=== Test 1: Health ==="
try {
    $r = Invoke-RestMethod -Uri 'https://bharbike-backend.onrender.com/health' -Method Get
    Write-Host "Health: $r"
} catch { Write-Host "Health FAILED: $_" }

Write-Host ""
Write-Host "=== Test 2: Create Order (Demo) ==="
try {
    $r = Invoke-RestMethod -Uri 'https://bharbike-backend.onrender.com/api/create-order' -Method Post -ContentType 'application/json' -Body $bytes
    Write-Host "Create Order: $($r | ConvertTo-Json)"
} catch { Write-Host "Create Order FAILED: $_" }

Write-Host ""
Write-Host "=== Test 3: Auth Send OTP ==="
try {
    $otpBody = '{"phone":"+919876543210"}'
    $otpBytes = [System.Text.Encoding]::UTF8.GetBytes($otpBody)
    $r = Invoke-RestMethod -Uri 'https://bharbike-backend.onrender.com/api/auth/send-otp' -Method Post -ContentType 'application/json' -Body $otpBytes
    Write-Host "Send OTP: $($r | ConvertTo-Json)"
} catch { Write-Host "Send OTP FAILED: $_" }
