import { createClient } from '@supabase/supabase-js';

// Derived from your Anon Key project reference: "zksibmrnfwsncxsufooy"
const SUPABASE_URL = 'https://zksibmrnfwsncxsufooy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprc2libXJuZndzbmN4c3Vmb295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMjg3MjMsImV4cCI6MjA4MDYwNDcyM30.vX_qZY-u0ynmYKmI9iR5Hl5WWnU4gAEMti5UL_AmArc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);