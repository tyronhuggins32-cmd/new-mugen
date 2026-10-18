# Supported formats at 0.1.0

| Format | Reading | Execution |
| --- | --- | --- |
| DEF / INI text | Ordered case-insensitive sections/keys, repeated entries, comments outside quotes, source lines, BOM | Metadata/reference inspection; no full character registration |
| CNS / ST text | StateDef/controller sections, limited expression grammar | Original fixtures use a small interpreter subset |
| CMD text | Command sections and CNS-style state blocks | Single/simultaneous/held buttons only |
| AIR text | Actions, integer sprite refs/offsets, duration, LoopStart, Clsn1/Clsn2 defaults/overrides | Original generated sprites mapped by image number |
| SFF / SND / FNT | Detected and reported | Not decoded |
| ACT / CFG / storyboard / motif | No dedicated implementation | Not supported |
| ZIP | No archive importer | Unzip locally, select the folder in Content Lab |

Folder selection uses the browser's directory input. Limits: 2,500 files, 128 MiB total, 4 MiB per text file. Unsafe paths are rejected. Expression parsing has a 4,096-token and 64-nesting budget. No imported scripts execute arbitrary JavaScript. The inspector's parsing success must not be read as proof of runtime compatibility.
