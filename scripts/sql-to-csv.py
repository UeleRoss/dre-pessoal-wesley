#!/usr/bin/env python3
"""
Converter dump PostgreSQL para CSV
Lê o arquivo data-only.sql e gera CSVs separados por tabela
"""

import re
import csv
import os

def parse_postgres_dump(sql_file):
    """Extrai dados do dump PostgreSQL"""

    with open(sql_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Encontrar todas as seções COPY
    copy_pattern = r'COPY public\.([^\s]+)\s*\(([^)]+)\)\s+FROM stdin;(.*?)\n\\\.\n'

    matches = re.findall(copy_pattern, content, re.DOTALL)

    tables = {}

    for table_name, columns_str, data_str in matches:
        # Limpar nome da tabela (remover aspas se existirem)
        table_name = table_name.strip('"')

        # Parse colunas
        columns = [col.strip() for col in columns_str.split(',')]

        # Parse dados
        lines = [line.strip() for line in data_str.strip().split('\n') if line.strip()]

        if not lines:
            continue

        tables[table_name] = {
            'columns': columns,
            'rows': []
        }

        for line in lines:
            # Split por tab, que é o separador do PostgreSQL COPY
            values = line.split('\t')
            tables[table_name]['rows'].append(values)

    return tables

def export_to_csv(tables, output_dir):
    """Exporta cada tabela para CSV"""

    os.makedirs(output_dir, exist_ok=True)

    print(f"\n📊 Exportando {len(tables)} tabelas para CSV...\n")

    for table_name, data in tables.items():
        csv_file = os.path.join(output_dir, f"{table_name}.csv")

        with open(csv_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)

            # Escrever cabeçalho
            writer.writerow(data['columns'])

            # Escrever dados
            for row in data['rows']:
                # Substituir \N (NULL do PostgreSQL) por string vazia
                row = ['' if val == '\\N' else val for val in row]
                writer.writerow(row)

        print(f"✅ {table_name}: {len(data['rows'])} registros → {csv_file}")

    print(f"\n🎉 Todos os CSVs salvos em: {output_dir}/")

if __name__ == '__main__':
    sql_file = 'backups/postgres-dump/data-only.sql'
    output_dir = 'backups/csv-files'

    print("🔥 Convertendo dump SQL → CSV...")

    tables = parse_postgres_dump(sql_file)
    export_to_csv(tables, output_dir)

    print("\n✅ CONVERSÃO COMPLETA!")
    print("📂 Pode abrir os arquivos no Excel, Numbers, etc!")
