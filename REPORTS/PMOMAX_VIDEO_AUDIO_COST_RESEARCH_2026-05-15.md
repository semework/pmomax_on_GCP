# PMOMax Video and Audio Editing Cost Research

Date: 2026-05-15

## Bottom line

The local PMOMax video editing, captioning, logo overlay, ffmpeg rendering, and Python assembly work cost `$0.00` in Google Cloud charges.

The Google Cloud Text-to-Speech usage recorded for the relevant video/audio work window was also billed at `$0.00` in the BigQuery billing export through 2026-05-14, because usage stayed below the monthly free character allowance.

The material real-dollar media cost found in prior PMOMax billing research is the earlier Vertex AI / Veo generation spend:

| Cost item | Period | Gross USD | Net / billed evidence | Notes |
|---|---:|---:|---:|---|
| Cloud Text-to-Speech, Chirp3-HD and WaveNet | 2026-04-08 to 2026-05-14 export | `$0.00` | `$0.00` in billing export | 250,902 total characters recorded. At list price after free tier, this would be about `$7.46`, but it was not charged in the export. |
| Local ffmpeg/Python editing and rendering | Current video work | `$0.00` | `$0.00` | Ran locally on the Mac. No Google Cloud service billed. |
| Vertex AI / Veo 3 Audio Video Generation | 2026-02 | `$444.80` | From Jan-Apr cost workbook/review | Earlier AI media/demo generation, not current local editing. |
| Vertex AI / Veo 3 Video Generation | 2026-02 | `$68.80` | From Jan-Apr cost workbook/review | Earlier AI media/demo generation, not current local editing. |
| Small Gemini API testing | 2026-01 to 2026-02 | `$6.34` | From Jan-Apr cost workbook/review | Uncertain attribution; likely experimentation/testing. |

## Text-to-Speech export evidence

Billing export table:

`katalyststreet-public.pmomaxbilling.gcp_billing_export_v1_018FC6_CC1985_24653C`

Export coverage checked:

| Min usage day | Max usage day | Rows |
|---|---:|---:|
| 2026-03-31 | 2026-05-14 | 454,059 |

TTS usage rows found:

| Day | SKU | Characters | Gross | Net |
|---|---|---:|---:|---:|
| 2026-04-08 | Count of characters for Chirp3-HD voices | 3,245 | `$0.00` | `$0.00` |
| 2026-04-24 | Count of characters for Chirp3-HD voices | 139 | `$0.00` | `$0.00` |
| 2026-04-26 | Count of characters for Chirp3-HD voices | 26,375 | `$0.00` | `$0.00` |
| 2026-04-29 | Count of characters for Chirp3-HD voices | 166,891 | `$0.00` | `$0.00` |
| 2026-05-12 | Count of characters for Chirp3-HD voices | 41,395 | `$0.00` | `$0.00` |
| 2026-05-12 | Count of characters for using wavenet voices | 2,425 | `$0.00` | `$0.00` |
| 2026-05-13 | Count of characters for Chirp3-HD voices | 10,432 | `$0.00` | `$0.00` |

Totals:

| Usage type | Characters | List-rate equivalent |
|---|---:|---:|
| Chirp3-HD | 248,477 | `$7.45` at `$30 / 1M` characters |
| WaveNet | 2,425 | `$0.01` at `$4 / 1M` characters |
| Total | 250,902 | `$7.46` after free tier, but export shows `$0.00` billed |

Google Cloud Text-to-Speech pricing says billing is based on characters sent to TTS, including spaces and newlines. Chirp 3: HD has a free usage limit up to 1 million characters and then costs `$0.00003` per character, or `$30` per 1 million characters. WaveNet has a free usage limit up to 4 million characters and then costs `$4` per 1 million characters.

## Relevant local outputs checked

| Folder | Size | Notes |
|---|---:|---|
| `REPORTS/pmomax_video_3min_2026-04-24` | 2.3 GB | 3-minute PMOMax video/audio variants, scripts, manifests, WAV/MP3/MP4 outputs. |
| `REPORTS/hfs_sas_awards_2026` | 350 MB | HFS one-minute audio/video, captions, branded final video, manifests. |

Final HFS manifest evidence:

| Field | Value |
|---|---|
| Voice | `en-US-Chirp3-HD-Orus` |
| Final MP3 duration | 60.0 seconds |
| Final MP4 duration | 60.0 seconds |
| Pronunciation validation | passed |
| SRT validation | passed |

## Interpretation

The current editing work itself did not create a meaningful cloud bill. The direct cloud TTS usage was free in the export. If Google had charged the listed overage rate from the first character, the whole observed TTS workload would still only be about `$7.46`.

The costly media line is not TTS or ffmpeg editing. It is the earlier Vertex AI / Veo generation recorded in the Jan-Apr review: `$513.60` for Veo video/audio-video generation, plus `$6.34` of Gemini API testing if included.

Therefore:

| Scope | Real dollar answer |
|---|---:|
| Current local video/audio editing, captions, logo overlay, assembly | `$0.00` cloud cost |
| Current and recent Google TTS usage visible in export | `$0.00` billed; `$7.46` list-rate equivalent after free tier math |
| Earlier AI media/video generation if it was part of making PMOMax promo assets | `$513.60` Veo, or `$519.95` including small Gemini/metadata testing |

