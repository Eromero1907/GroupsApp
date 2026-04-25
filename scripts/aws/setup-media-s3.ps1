param(
  [Parameter(Mandatory = $true)][string]$BucketName,
  [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"

Write-Host "Creating/checking bucket: $BucketName ($Region)"
$bucketExists = $false
cmd /c "aws s3api head-bucket --bucket $BucketName >nul 2>nul"
if ($LASTEXITCODE -eq 0) {
  $bucketExists = $true
}
if (-not $bucketExists) {
  if ($Region -eq "us-east-1") {
    aws s3api create-bucket --bucket $BucketName --region $Region | Out-Null
  } else {
    aws s3api create-bucket --bucket $BucketName --region $Region --create-bucket-configuration LocationConstraint=$Region | Out-Null
  }
}

Write-Host "Disabling Block Public Access (bucket level)"
aws s3api put-public-access-block `
  --bucket $BucketName `
  --public-access-block-configuration BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false | Out-Null

$policy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadObjects",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BucketName/*"
    }
  ]
}
"@

$cors = @"
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD", "PUT", "POST", "DELETE"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
"@

$tmpPolicy = Join-Path $env:TEMP "groupsapp-s3-policy.json"
$tmpCors = Join-Path $env:TEMP "groupsapp-s3-cors.json"
$policy | Set-Content -Path $tmpPolicy -Encoding ASCII
$cors | Set-Content -Path $tmpCors -Encoding ASCII

Write-Host "Applying bucket policy + CORS"
aws s3api put-bucket-policy --bucket $BucketName --policy file://$tmpPolicy | Out-Null
aws s3api put-bucket-cors --bucket $BucketName --cors-configuration file://$tmpCors | Out-Null

Remove-Item $tmpPolicy, $tmpCors -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "S3 setup completed."
Write-Host "Bucket: $BucketName"
Write-Host "Region: $Region"
Write-Host "Set in K8s secret: s3.bucket=$BucketName"
