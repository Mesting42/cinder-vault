$ErrorActionPreference = 'Stop'
$voiceOutputDir = Join-Path (Split-Path $PSScriptRoot) 'public/audio'
New-Item -ItemType Directory -Path $voiceOutputDir -Force | Out-Null
$voiceLines = @(
  @{Id='shooter-1';Text='枪膛里还有余火。这趟，我来开路。';Voice='Kangkang';Rate=-1},
  @{Id='shooter-2';Text='别替我数子弹。替他们敲钟。';Voice='Kangkang';Rate=-1},
  @{Id='mage-1';Text='把灯交给我。黑暗，也会在霜中安静。';Voice='Huihui';Rate=-1},
  @{Id='mage-2';Text='钟声留给亡者。活着的人，跟紧我的霜灯。';Voice='Huihui';Rate=-1},
  @{Id='warrior-1';Text='站到我身后。这一刀，劈开前路。';Voice='Kangkang';Rate=-2},
  @{Id='warrior-2';Text='门若不开，就让它记住我的剑。';Voice='Kangkang';Rate=-2}
)
$voiceEvidence = foreach ($voiceLine in $voiceLines) {
  $speaker = New-Object -ComObject SAPI.SpVoice
  $voiceToken = New-Object -ComObject SAPI.SpObjectToken
  $voiceTokenPath = @('HKEY_LOCAL_MACHINE','SOFTWARE','Microsoft','Speech_OneCore','Voices','Tokens',('MSTTS_V110_zhCN_' + $voiceLine.Voice + 'M')) -join [char]92
  $voiceToken.SetId($voiceTokenPath)
  $speaker.Voice = $voiceToken
  $speaker.Rate = $voiceLine.Rate
  $speaker.Volume = 100
  $voiceFile = Join-Path $voiceOutputDir ('voice-' + $voiceLine.Id + '.wav')
  $voiceStream = New-Object -ComObject SAPI.SpFileStream
  $voiceStream.Format.Type = 22
  $voiceStream.Open($voiceFile,3,$false)
  $speaker.AudioOutputStream = $voiceStream
  [void]$speaker.Speak($voiceLine.Text)
  $voiceStream.Close()
  [pscustomobject]@{id=$voiceLine.Id;text=$voiceLine.Text;voice=$speaker.Voice.GetDescription();bytes=(Get-Item -LiteralPath $voiceFile).Length;file=$voiceFile}
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($voiceStream)
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($speaker)
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($voiceToken)
}
$voiceEvidence | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath (Join-Path (Split-Path $PSScriptRoot) 'test-artifacts/character-voice-generation.json') -Encoding UTF8
$voiceEvidence | Select-Object id,voice,bytes | ConvertTo-Json
