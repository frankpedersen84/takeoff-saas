const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
    try {
        supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: false
            }
        });
        logger.info('Supabase client initialized');
    } catch (error) {
        logger.error('Failed to initialize Supabase client', { error: error.message });
    }
} else {
    logger.warn('Supabase credentials missing. Running in local memory-only mode.');
}

const isSupabaseConfigured = () => !!supabase;

module.exports = {
    supabase,
    isSupabaseConfigured
};
