Write-Host "=== Step 1: Send OTP ==="
$otpBody = '{"phone":"+919876543210"}'
$otpBytes = [System.Text.Encoding]::UTF8.GetBytes($otpBody)
$sendResult = Invoke-RestMethod -Uri 'https://bharbike-backend.onrender.com/api/auth/send-otp' -Method Post -ContentType 'application/json' -Body $otpBytes
Write-Host "Demo OTP: $($sendResult.data.demo_otp_hint)"

Write-Host ""
Write-Host "=== Step 2: Verify OTP ==="
$verifyBody = '{"phone":"+919876543210","otp":"123456"}'
$verifyBytes = [System.Text.Encoding]::UTF8.GetBytes($verifyBody)
try {
    $verifyResult = Invoke-RestMethod -Uri 'https://bharbike-backend.onrender.com/api/auth/verify-otp' -Method Post -ContentType 'application/json' -Body $verifyBytes
    $token = $verifyResult.data.token
    $userId = $verifyResult.data.user.id
    Write-Host "Token received: $($token.Substring(0,20))..."
    Write-Host "User ID: $userId"
} catch {
    Write-Host "Verify OTP FAILED: $_"
    exit
}

Write-Host ""
Write-Host "=== Step 3: Wallet Summary ==="
try {
    $headers = @{ Authorization = "Bearer $token" }
    $walletResult = Invoke-RestMethod -Uri 'https://bharbike-backend.onrender.com/api/wallet/summary' -Method Get -Headers $headers
    Write-Host "Wallet Balance: $($walletResult.data.balance)"
} catch { Write-Host "Wallet FAILED: $_" }

Write-Host ""
Write-Host "=== Step 4: User Stats ==="
try {
    $statsResult = Invoke-RestMethod -Uri "https://bharbike-backend.onrender.com/api/user/stats/$userId" -Method Get -Headers $headers
    Write-Host "Stats: rides=$($statsResult.data.total_rides) distance=$($statsResult.data.total_distance)"
} catch { Write-Host "Stats FAILED: $_" }

Write-Host ""
Write-Host "=== Step 5: Create Demo Order ==="
try {
    $orderBody = "{`"amount`":100,`"user_id`":`"$userId`",`"plan_name`":`"daily`"}"
    $orderBytes = [System.Text.Encoding]::UTF8.GetBytes($orderBody)
    $orderResult = Invoke-RestMethod -Uri 'https://bharbike-backend.onrender.com/api/create-order' -Method Post -ContentType 'application/json' -Body $orderBytes -Headers $headers
    Write-Host "Order created: id=$($orderResult.id) demo=$($orderResult.is_demo)"
} catch { Write-Host "Order FAILED: $_" }
