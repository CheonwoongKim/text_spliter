# Document Vision comparison

The Parser workspace can compare document parsers with OpenAI, Gemini, Claude,
and Qwen vision models. Each engine has a saved profile under **Settings →
Document engines** and credentials under **Settings → Connections → Vision
Models**.

## Input policy

| Source | OpenAI / Gemini / Claude | Qwen |
| --- | --- | --- |
| PDF | Native PDF input | PNG page fallback |
| PNG / JPEG / WebP | Original image | Original image |
| DOC / DOCX | Native Word page capture | Native Word page capture |
| HWP / HWPX | Native Hancom page capture | Native Hancom page capture |
| PPT / PPTX | Native presentation page capture | Native presentation page capture |

PDF rasterization is never the default for providers that accept a PDF. Office
and HWP files are not converted through PDF because that intermediate step can
change layout, line wrapping, diagrams, and pagination.

Provider references:

- [OpenAI file inputs](https://developers.openai.com/api/docs/guides/file-inputs)
- [Gemini document processing](https://ai.google.dev/gemini-api/docs/document-processing)
- [Claude PDF support](https://platform.claude.com/docs/en/build-with-claude/pdf-support)
- [Qwen-VL OpenAI-compatible API](https://help.aliyun.com/en/model-studio/qwen-vl-compatible-with-openai)

## Native renderer contract

Word and Hancom rendering requires software licensed and deployed by the
operator. The application integrates with that deployment through a small HTTP
contract; it does not emulate Word/Hancom rendering or silently use
LibreOffice-to-PDF conversion.

Health check:

```http
GET {baseUrl}/health
Authorization: Bearer {apiKey}  # optional
```

Render request:

```http
POST {baseUrl}/v1/render
Authorization: Bearer {apiKey}  # optional
Content-Type: multipart/form-data

file=<original file>
mode=native-page-capture | rasterized-fallback
outputFormat=png
```

`native-page-capture` must render the original DOC/DOCX/HWP/HWPX/PPT/PPTX file
with its native renderer. `rasterized-fallback` is reserved for PDF models that
cannot accept a PDF directly.

Response:

```json
{
  "renderer": {
    "name": "hancom-office-renderer",
    "version": "2026.1"
  },
  "pages": [
    {
      "pageNumber": 1,
      "mimeType": "image/png",
      "data": "iVBORw0KGgo..."
    }
  ]
}
```

`data`, `base64`, or `imageBase64` may contain raw Base64 or a data URL. Pages
are ordered by `pageNumber`. The renderer name/version and the resolved input
mode are stored with each parse run so comparisons remain auditable.

## Database migration

Apply `supabase/migrations/20260806090000_vision_engine_settings.sql` after the
existing parser engine settings migration. It extends the saved-profile check
constraint to the four Vision engines.
