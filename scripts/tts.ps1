# Synthesizes each narration line to its own WAV file using Windows SAPI.
Add-Type -AssemblyName System.Speech

$manifest = Get-Content "recordings\narration.json" -Raw | ConvertFrom-Json
$outDir = "recordings\narration"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice("Microsoft Zira Desktop")
$synth.Rate = 1

$i = 0
foreach ($line in $manifest) {
  $i++
  $file = Join-Path $outDir ("line{0:D2}.wav" -f $i)
  $synth.SetOutputToWaveFile($file)
  $synth.Speak($line.text)
  $synth.SetOutputToNull()
  Write-Output "wrote $file for start=$($line.start): $($line.text)"
}
