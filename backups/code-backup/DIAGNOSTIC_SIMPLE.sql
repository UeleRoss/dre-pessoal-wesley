-- =====================================================
-- DIAGNÓSTICO SIMPLES: Ver o que existe no banco
-- =====================================================

-- 1. Ver TODAS as tabelas
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
