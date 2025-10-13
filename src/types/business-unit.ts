export interface BusinessUnit {
  id: string;
  name: string;
  color: string;
  icon: string;
  user_id: string;
  created_at: string;
}

export const DEFAULT_BUSINESS_UNITS = [
  { name: 'Apartamento', color: '#ef4444', icon: 'home' },
  { name: 'Escritório', color: '#3b82f6', icon: 'briefcase' },
  { name: 'Viagens e Lazer', color: '#8b5cf6', icon: 'plane' },
  { name: 'Vida Esportiva', color: '#10b981', icon: 'dumbbell' },
  { name: 'Compras Pessoais', color: '#f59e0b', icon: 'shopping-bag' },
  { name: 'Go On Outdoor', color: '#14b8a6', icon: 'mountain' },
  { name: 'Carro', color: '#6366f1', icon: 'car' },
  { name: 'Comida', color: '#ec4899', icon: 'utensils' },
] as const;

// Mapeamento de categorias para unidades de negócio (sugestões automáticas)
export const CATEGORY_TO_BUSINESS_UNIT_MAP: Record<string, string> = {
  // Apartamento
  'Apartamento': 'Apartamento',
  'Aluguel': 'Apartamento',
  'Condomínio': 'Apartamento',

  // Escritório
  'Escritório': 'Escritório',
  'Coworking': 'Escritório',

  // Viagens e Lazer
  'Lazer e ócio': 'Viagens e Lazer',
  'Viagem': 'Viagens e Lazer',

  // Vida Esportiva
  'Vida esportiva': 'Vida Esportiva',
  'Academia': 'Vida Esportiva',
  'Esporte': 'Vida Esportiva',

  // Go On Outdoor
  'Go On Outdoor': 'Go On Outdoor',

  // Carro
  'Carro': 'Carro',
  'Transporte': 'Carro',

  // Comida
  'Comida': 'Comida',
  'Alimentação': 'Comida',
  'Mercado': 'Comida',
  'Restaurante': 'Comida',

  // Compras Pessoais (default para outros)
  'Itens Físicos': 'Compras Pessoais',
  'Estudos': 'Compras Pessoais',
};
