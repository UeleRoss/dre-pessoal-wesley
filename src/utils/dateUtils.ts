
import { format, parseISO } from 'date-fns';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

// Converter data local para o timezone do Brasil para salvar no banco
export const toBrazilTimezone = (date: Date): Date => {
  return fromZonedTime(date, BRAZIL_TIMEZONE);
};

// Converter data do banco para o timezone do Brasil para exibir
export const fromBrazilTimezone = (dateString: string): Date => {
  const utcDate = parseISO(dateString);
  return toZonedTime(utcDate, BRAZIL_TIMEZONE);
};

// Formatar data no timezone do Brasil
export const formatBrazilDate = (date: Date | string, formatStr: string = 'dd/MM/yyyy'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, BRAZIL_TIMEZONE, formatStr, { locale: ptBR });
};

// Formatar data e hora no timezone do Brasil
export const formatBrazilDateTime = (date: Date | string): string => {
  return formatBrazilDate(date, 'dd/MM/yyyy HH:mm');
};

// Obter data atual no timezone do Brasil no formato ISO para o banco
export const getCurrentBrazilDate = (): string => {
  const now = new Date();
  const brazilDate = toZonedTime(now, BRAZIL_TIMEZONE);
  return format(brazilDate, 'yyyy-MM-dd');
};

// Obter data e hora atual no timezone do Brasil
export const getCurrentBrazilDateTime = (): Date => {
  const now = new Date();
  return toZonedTime(now, BRAZIL_TIMEZONE);
};
