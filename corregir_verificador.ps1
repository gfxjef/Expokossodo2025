# Script para corregir VerificadorSala.js
$filePath = "frontend\src\components\VerificadorSala.js"
$content = Get-Content $filePath

# Agregar setAsistenteEscaneado después de la línea del setSuccess
$newContent = @()
for ($i = 0; $i -lt $content.Length; $i++) {
    $newContent += $content[$i]
    if ($content[$i] -match "setSuccess\(`ℹ \${data\.usuario} ya ingresó a esta sala anteriormente`\);") {
        $newContent += "          setAsistenteEscaneado(data.usuario);"
    }
    if ($content[$i] -match "setSuccess\(` ¡\${data\.usuario\.nombres} registrado exitosamente en la sala!`\);") {
        $newContent += "        setAsistenteEscaneado(data.usuario);"
    }
}

$newContent | Set-Content $filePath -Encoding UTF8
Write-Host "Correcciones aplicadas exitosamente"
