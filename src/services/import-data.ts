/**
 * Importação de dados históricos dos CSVs
 */

import { execute, uuid, now } from './database';

export async function importHistoricalData() {
  console.log('📥 Importando dados históricos...');

  // Importar na ordem correta (foreign keys)
  await importBusinessUnits();
  await importCategories();
  await importUnitCategories();
  await importBankBalances();
  await importRecurringBills();
  await importFinancialItems();

  console.log('✅ Importação concluída!');
}

async function importBusinessUnits() {
  const csv = await fetch('/backups/csv-files/business_units.csv').then(r => r.text());
  const lines = csv.split('\n').slice(1); // Pular header

  const seen = new Set<string>(); // Evitar duplicatas por nome

  for (const line of lines) {
    if (!line.trim()) continue;
    const [id, name, color, icon, , created_at] = parseCSVLine(line);

    // Pular se já importamos uma unidade com esse nome
    if (seen.has(name)) continue;
    seen.add(name);

    execute(
      `INSERT OR IGNORE INTO business_units (id, name, color, icon, created_at) VALUES (?, ?, ?, ?, ?)`,
      [id, name, color || null, icon || null, created_at || now()]
    );
  }
  console.log(`✅ business_units importadas (${seen.size} únicas)`);
}

async function importCategories() {
  const csv = await fetch('/backups/csv-files/categories.csv').then(r => r.text());
  const lines = csv.split('\n').slice(1);

  for (const line of lines) {
    if (!line.trim()) continue;
    const [id, , name, created_at] = parseCSVLine(line);

    execute(
      `INSERT OR IGNORE INTO categories (id, name, created_at) VALUES (?, ?, ?)`,
      [id, name, created_at || now()]
    );
  }
  console.log(`✅ categories importadas`);
}

async function importUnitCategories() {
  const csv = await fetch('/backups/csv-files/unit_categories.csv').then(r => r.text());
  const lines = csv.split('\n').slice(1);

  // Mapeamento: business_unit antigo -> business_unit novo (sem duplicatas)
  const unitMapping = new Map<string, string>();

  // Primeiro, construir mapa de unidades duplicadas
  const unitsCSV = await fetch('/backups/csv-files/business_units.csv').then(r => r.text());
  const unitLines = unitsCSV.split('\n').slice(1);
  const nameToId = new Map<string, string>();

  for (const line of unitLines) {
    if (!line.trim()) continue;
    const [id, name] = parseCSVLine(line);
    if (!nameToId.has(name)) {
      nameToId.set(name, id);
    }
    unitMapping.set(id, nameToId.get(name)!);
  }

  const seen = new Set<string>();
  let count = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    const [id, , business_unit_id, type, name, created_at] = parseCSVLine(line);

    // Mapear para ID único da unidade
    const mappedUnitId = unitMapping.get(business_unit_id) || business_unit_id;

    // Evitar duplicatas: mesma unidade + tipo + nome
    const key = `${mappedUnitId}-${type}-${name}`;
    if (seen.has(key)) continue;
    seen.add(key);

    execute(
      `INSERT OR IGNORE INTO unit_categories (id, business_unit_id, type, name, created_at) VALUES (?, ?, ?, ?, ?)`,
      [id, mappedUnitId, type, name, created_at || now()]
    );
    count++;
  }
  console.log(`✅ unit_categories importadas: ${count} únicas`);
}

async function importBankBalances() {
  try {
    const csv = await fetch('/backups/csv-files/bank_balances.csv').then(r => r.text());
    const lines = csv.split('\n').slice(1);

    for (const line of lines) {
      if (!line.trim()) continue;
      const [id, , bank_name, initial_balance, created_at, updated_at, baseline_date] = parseCSVLine(line);

      execute(
        `INSERT OR IGNORE INTO bank_balances (id, bank_name, initial_balance, baseline_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, bank_name, parseFloat(initial_balance || '0'), baseline_date || null, created_at || now(), updated_at || now()]
      );
    }
    console.log(`✅ bank_balances importadas`);
  } catch (e) {
    console.log('⚠️  bank_balances não encontrada, pulando...');
  }
}

async function importRecurringBills() {
  const csv = await fetch('/backups/csv-files/recurring_bills.csv').then(r => r.text());
  const lines = csv.split('\n').slice(1);

  let count = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    // Colunas: id, user_id, name, value, category, due_date, bank, recurring, paid_this_month, created_at, updated_at
    const [id, , name, value, category, due_date, bank, , , created_at, updated_at] = parseCSVLine(line);

    execute(
      `INSERT OR IGNORE INTO recurring_bills (id, name, value, due_date, category, bank, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, parseFloat(value), parseInt(due_date), category || null, bank || null, created_at || now(), updated_at || now()]
    );
    count++;
  }
  console.log(`✅ recurring_bills importadas: ${count} contas`);
}

async function importFinancialItems() {
  const csv = await fetch('/backups/csv-files/financial_items.csv').then(r => r.text());
  const lines = csv.split('\n').slice(1);

  // Mapear business_unit_id duplicados para únicos
  const unitMapping = new Map<string, string>();
  const unitsCSV = await fetch('/backups/csv-files/business_units.csv').then(r => r.text());
  const unitLines = unitsCSV.split('\n').slice(1);
  const nameToId = new Map<string, string>();

  for (const line of unitLines) {
    if (!line.trim()) continue;
    const [id, name] = parseCSVLine(line);
    if (!nameToId.has(name)) {
      nameToId.set(name, id);
    }
    unitMapping.set(id, nameToId.get(name)!);
  }

  let count = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = parseCSVLine(line);

    // Headers: id,user_id,date,type,description,amount,category,bank,source,business_unit_id,is_recurring,is_installment,total_installments,installment_start_month,installment_end_month,credit_card,recurring_template_id,recurring_status,installment_group_id,installment_number,created_at,updated_at
    const [id, , date, type, description, amount, category, bank, , business_unit_id, , is_installment, total_installments, , , , , , installment_group_id, installment_number, created_at, updated_at] = parts;

    // Mapear para ID único
    const mappedUnitId = business_unit_id ? (unitMapping.get(business_unit_id) || business_unit_id) : null;

    execute(
      `INSERT OR IGNORE INTO financial_items (
        id, date, type, description, amount, category, bank, business_unit_id,
        is_installment, total_installments, installment_number, installment_group_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        date,
        type || 'saida',
        description,
        parseFloat(amount),
        category || null,
        bank || null,
        mappedUnitId,
        is_installment === 't' || is_installment === '1' || is_installment === 'true' ? 1 : 0,
        total_installments ? parseInt(total_installments) : null,
        installment_number ? parseInt(installment_number) : null,
        installment_group_id || null,
        created_at || now(),
        updated_at || now()
      ]
    );
    count++;
  }
  console.log(`✅ financial_items importadas: ${count} registros`);
}

/**
 * Parse simples de linha CSV
 * Lida com valores entre aspas e vírgulas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && nextChar === '"' && inQuotes) {
      // Aspas duplas escapadas
      current += '"';
      i++; // Pular próxima aspas
    } else if (char === '"') {
      // Toggle quote mode
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      // Separador (vírgula fora de aspas)
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}
