#! /usr/bin/env powershell
<# 
Sitemap Generator Script - Fixed Version
#>
[CmdletBinding()]
param(
    [ValidateScript({ Test-Path  -PathType Container })]
    [string] = (Get-Location).Path,

    [string[]] = @('.html', '.htm', '.php', '.asp', '.json', '.svg', '.pdf', '.docx', '.txt'),

    [string] = 'https://baijingzixun.top',

    [ValidateSet('always','daily','weekly','monthly','yearly','never')]
    [string] = 'weekly',

    [double] = 0.8
)

if( -not  ){
    Write-Error 'Please set --BaseUrl to your site root address'
    exit 1
}
if( -not .StartsWith('http')){
     = "https://"
}

 = @('bin','obj','node_modules','packages','.git','backup','temp')
 = Get-ChildItem -Path  -Recurse -File | Where-Object {
    ( -contains .Extension) -and ( -notcontains .Directory.Name)
}

if( .Count -eq 0 ){
    Write-Host 'No matching files found'
    exit 0
}

  = Join-Path  'sitemap.xml'
 = [DateTime]::Now.ToString('yyyyMMdd_HHmmss')
 = Join-Path  ("sitemap.backup..xml")
if( Test-Path  ){
    Copy-Item   -Force
    Write-Host "Backup created: sitemap.backup..xml"
}

# Generate XML
 = '<?xml version="1.0" encoding="UTF-8"?>'
 += "
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">"

 = 0
foreach(  in  ){
     = .FullName.Substring(.Length).TrimStart('\','/').Replace('\','/')
     = [uri]::EscapeUriString("/")
    
     += "
  <url>"
     += "
    <loc></loc>"
     += "
    <lastmod></lastmod>"
     += "
    <changefreq></changefreq>"
     += "
    <priority></priority>"
     += "
  </url>"
    ++
}

 += "
</urlset>"

[System.IO.File]::WriteAllText(, , [System.Text.Encoding]::UTF8)
Write-Host "Sitemap generated successfully: " -ForegroundColor Green
Write-Host "Total URLs: " -ForegroundColor Yellow
