$body = '{"amount":100}'
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)

try {
    $response = Invoke-WebRequest -Uri 'https://bharbike-backend.onrender.com/api/create-order' -Method Post -ContentType 'application/json' -Body $bytes -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)"
    Write-Host "Body: $($response.Content)"
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode)"
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $errorBody = $reader.ReadToEnd()
    Write-Host "Error: $errorBody"
}
