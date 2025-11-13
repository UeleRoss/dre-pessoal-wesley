-- Atualizar saldos corretos dos bancos para agosto 2025
UPDATE bank_balances 
SET initial_balance = 233.94, updated_at = now()
WHERE bank_name = 'C6 BANK';

UPDATE bank_balances 
SET initial_balance = 819.56, updated_at = now()
WHERE bank_name = 'CONTA SIMPLES';

UPDATE bank_balances 
SET initial_balance = 5143.70, updated_at = now()
WHERE bank_name = 'ASAAS';

UPDATE bank_balances 
SET initial_balance = 0.00, updated_at = now()
WHERE bank_name = 'BRADESCO';

UPDATE bank_balances 
SET initial_balance = 355.00, updated_at = now()
WHERE bank_name = 'NOMAD';