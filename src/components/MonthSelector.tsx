
import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MonthSelectorProps {
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
}

const MonthSelector = ({ selectedMonth, onMonthChange }: MonthSelectorProps) => {
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const currentMonth = selectedMonth.getMonth();
  const currentYear = selectedMonth.getFullYear();

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedMonth);
    if (direction === 'prev') {
      newDate.setMonth(currentMonth - 1);
    } else {
      newDate.setMonth(currentMonth + 1);
    }
    onMonthChange(newDate);
  };

  return (
    <div className="flex items-center justify-center space-x-4 bg-white rounded-xl shadow-lg p-4 mb-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigateMonth('prev')}
        className="h-10 w-10 p-0 hover:bg-navy-50"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center space-x-3">
        <Calendar className="h-5 w-5 text-navy-600" />
        <div className="text-center">
          <h2 className="text-lg font-semibold text-navy-800">
            {months[currentMonth]} {currentYear}
          </h2>
          <p className="text-sm text-navy-500">Período selecionado</p>
        </div>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigateMonth('next')}
        className="h-10 w-10 p-0 hover:bg-navy-50"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default MonthSelector;
