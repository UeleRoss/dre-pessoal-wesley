-- Corrigir o saldo do C6 BANK para o valor correto
UPDATE bank_balances 
SET initial_balance = 233.94, updated_at = now()
WHERE bank_name = 'C6 BANK';