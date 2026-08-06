-- Extend the existing engine profile store to include document vision models.
ALTER TABLE IF EXISTS public.parser_engine_settings
  DROP CONSTRAINT IF EXISTS parser_engine_settings_parser_type_check;

ALTER TABLE IF EXISTS public.parser_engine_settings
  ADD CONSTRAINT parser_engine_settings_parser_type_check
  CHECK (parser_type IN (
    'Upstage',
    'LlamaIndex',
    'Azure',
    'Google',
    'Docling',
    'OpenAI Vision',
    'Gemini Vision',
    'Claude Vision',
    'Qwen Vision'
  ));

COMMENT ON TABLE public.parser_engine_settings IS
  'Per-user saved profiles for parser and vision document engines.';
