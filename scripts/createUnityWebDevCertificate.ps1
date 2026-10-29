$frontendRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$directory = Join-Path $frontendRoot '.tmp\unity-web-dev'
New-Item -ItemType Directory -Path $directory -Force | Out-Null
$marker = Join-Path $directory 'cert-thumbprint.txt'
$keyFile = Join-Path $directory 'localhost-key.pem'
$certFile = Join-Path $directory 'localhost-cert.pem'
$thumbprint = if (Test-Path -LiteralPath $marker) { (Get-Content -LiteralPath $marker -Raw).Trim() } else { '' }
$installed = if ($thumbprint) { Get-Item -LiteralPath "Cert:\CurrentUser\My\$thumbprint" -ErrorAction SilentlyContinue } else { $null }
$trusted = if ($thumbprint) { Test-Path -LiteralPath "Cert:\CurrentUser\Root\$thumbprint" } else { $false }
if ($installed -and $trusted -and $installed.NotAfter -gt (Get-Date).AddDays(1) -and
    (Test-Path -LiteralPath $keyFile) -and (Test-Path -LiteralPath $certFile)) {
    Write-Output "已复用本机 localhost 证书：$thumbprint"
    exit 0
}

$certificate = New-SelfSignedCertificate -DnsName 'localhost' -CertStoreLocation 'Cert:\CurrentUser\My' `
    -NotAfter (Get-Date).AddDays(30) -KeyExportPolicy Exportable -KeyAlgorithm RSA -KeyLength 2048 -HashAlgorithm SHA256
$privateKey = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($certificate)
[System.IO.File]::WriteAllText($keyFile, $privateKey.ExportPkcs8PrivateKeyPem(), [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText($certFile, $certificate.ExportCertificatePem(), [System.Text.UTF8Encoding]::new($false))
$cerFile = Join-Path $directory 'localhost.cer'
Export-Certificate -Cert $certificate -FilePath $cerFile | Out-Null
Import-Certificate -FilePath $cerFile -CertStoreLocation 'Cert:\CurrentUser\Root' | Out-Null
[System.IO.File]::WriteAllText($marker, $certificate.Thumbprint, [System.Text.UTF8Encoding]::new($false))
Write-Output "已创建并信任本机 localhost 证书：$($certificate.Thumbprint)"
