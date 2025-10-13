export type TransactionType = 'entrada' | 'saida';

export const DEFAULT_CATEGORIES_BY_TYPE_AND_UNIT: Record<TransactionType, Record<string, string[]>> = {
  saida: {
    Apartamento: ['Condomínio', 'Aluguel', 'Luz', 'Água', 'Internet', 'Gás', 'IPTU', 'Reformas', 'Manutenção', 'Móveis'],
    Escritório: ['Aluguel', 'Luz', 'Internet', 'Material de Escritório', 'Limpeza', 'Equipamentos', 'Software', 'AI', 'Telefone', 'Impostos'],
    'Viagens e Lazer': ['Passagens', 'Hospedagem', 'Alimentação', 'Passeios', 'Ingressos', 'Souvenirs', 'Transporte'],
    'Vida Esportiva': ['Academia', 'Personal Trainer', 'Equipamentos', 'Roupas Esportivas', 'Suplementos', 'Competições'],
    'Compras Pessoais': ['Roupas', 'Eletrônicos', 'Livros', 'Acessórios', 'Presentes', 'Cosméticos', 'Farmácia'],
    'Go On Outdoor': ['Despesas Operacionais', 'Marketing', 'Fornecedores', 'Equipamentos', 'Logística', 'Taxas'],
    Carro: ['Combustível', 'Manutenção', 'Seguro', 'IPVA', 'Estacionamento', 'Multas', 'Lavagem', 'Pedágio'],
    Comida: ['Supermercado', 'Restaurante', 'Delivery', 'Padaria', 'Feira', 'Açougue', 'Bebidas'],
  },
  entrada: {
    Apartamento: ['Aluguel Recebido', 'Venda de Móveis', 'Reembolso de Despesas', 'Devolução de Caução'],
    Escritório: ['Receitas de Serviços', 'Consultorias', 'Reembolsos', 'Venda de Equipamentos', 'AI'],
    'Viagens e Lazer': ['Reembolsos', 'Prêmios', 'Cashback'],
    'Vida Esportiva': ['Prêmios', 'Patrocínios', 'Venda de Equipamentos', 'Reembolsos'],
    'Compras Pessoais': ['Vendas', 'Reembolsos', 'Devoluções', 'Cashback'],
    'Go On Outdoor': ['Vendas Online', 'Vendas Presenciais', 'Parcerias', 'Comissões', 'Patrocínios', 'Eventos'],
    Carro: ['Venda do Veículo', 'Aluguel do Veículo', 'Reembolso de Combustível', 'Indenização de Seguro'],
    Comida: ['Venda de Produtos', 'Reembolsos'],
  },
};

export const getDefaultCategoriesForUnit = (
  type: TransactionType,
  unitName?: string | null
): string[] => {
  if (!unitName) return [];
  return DEFAULT_CATEGORIES_BY_TYPE_AND_UNIT[type]?.[unitName] || [];
};
