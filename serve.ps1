# Static file server nhanh cho việc test app (localhost:8787)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:8787/')
try {
  $listener.Start()
} catch {
  Write-Output "HTTP_LISTENER_FAILED: $($_.Exception.Message)"
  exit 1
}
Write-Output "SERVING $root on http://localhost:8787/"
$mime = @{'.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.mjs'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.json'='application/json'; '.csv'='text/csv'; '.png'='image/png'; '.svg'='image/svg+xml'; '.yml'='text/yaml'; '.md'='text/markdown; charset=utf-8'}
while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $rel = $ctx.Request.Url.LocalPath.TrimStart('/')
    if ($rel -eq '') { $rel = 'index.html' }
    $path = Join-Path $root $rel
    if ((Test-Path $path -PathType Leaf) -and ($path.StartsWith($root, [StringComparison]::OrdinalIgnoreCase))) {
      $bytes = [System.IO.File]::ReadAllBytes($path)
      $ext = [System.IO.Path]::GetExtension($path).ToLower()
      if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
      $ctx.Response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
      $msg = [Text.Encoding]::UTF8.GetBytes('Not found')
      $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $ctx.Response.Close()
  } catch {
    Write-Output "REQ_ERR: $($_.Exception.Message)"
  }
}
