Los archivos `tone_10_0.caf` a `tone_10_12.caf` se generan desde los MP3 existentes con:

```bash
npm run prepare:ios-tones --workspace=apps/mobile
```

No renombres un MP3 a `.caf`: iOS exige audio compatible (este proyecto genera PCM mono a 44.1 kHz).
