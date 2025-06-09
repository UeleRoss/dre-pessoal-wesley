import { useCalculatedBankBalances } from './useBankBalances';
import { FinancialItem } from '@/types/financial'; // Assuming this path is correct

// Minimal FinancialItem structure for tests
const mockFinancialItem = (
  date: string,
  bank: string,
  type: 'entrada' | 'saida',
  amount: number,
  source: string = 'manual' // Default source, can be overridden
): FinancialItem => ({
  id: Math.random().toString(),
  user_id: 'test-user',
  date,
  description: `Test item ${type} ${amount}`,
  amount,
  type,
  bank,
  category: 'Test Category',
  created_at: new Date().toISOString(),
  source,
  status: 'completed', // default status
});

describe('useCalculatedBankBalances', () => {
  // Helper to find a bank's data in the results
  const findBankData = (result: any[], bankName: string) => result.find(b => b.name === bankName);

  describe('Scenario 1: No initial balance, transactions only in period', () => {
    it('should calculate balances correctly', () => {
      const availableBanks = ["Bank A"];
      const bankBalances: any[] = [{ bank_name: "Bank A", initial_balance: 0 }];
      const allItems = [
        mockFinancialItem("2023-10-15", "Bank A", "entrada", 100),
      ];
      const periodItems = [
        mockFinancialItem("2023-10-15", "Bank A", "entrada", 100),
      ];

      // Note: In tests, directly calling the function part of the hook
      const result = useCalculatedBankBalances(availableBanks, bankBalances, allItems, periodItems);
      const bankAData = findBankData(result, "Bank A");

      expect(bankAData.balance).toBe(100); // currentBalance
      expect(bankAData.previousBalance).toBe(0);
    });
  });

  describe('Scenario 2: Initial balance, transactions only before period', () => {
    it('should calculate balances correctly', () => {
      const availableBanks = ["Bank A"];
      const bankBalances = [{ bank_name: "Bank A", initial_balance: 50 }];
      const allItems = [
        mockFinancialItem("2023-09-10", "Bank A", "entrada", 100),
      ];
      // Period is, for example, October. So periodItems for Bank A would be empty.
      const periodItems: FinancialItem[] = [
        // To define the period, let's add an item for another bank for Oct 1st
        mockFinancialItem("2023-10-01", "Bank B", "entrada", 1)
      ];
      // Or an empty array if periodItems is strictly for items *within* the period
      // const periodItemsForScenario: FinancialItem[] = [];


      const result = useCalculatedBankBalances(availableBanks, bankBalances, allItems, periodItems);
      const bankAData = findBankData(result, "Bank A");

      // currentBalance = initial (50) + all movement (100) = 150
      expect(bankAData.balance).toBe(150);
      // previousBalance: periodItems for Bank A is effectively empty.
      // The hook logic says: if periodBankItems is empty, previousBalance = currentBalance.
      // However, the definition of periodStart is based on periodItems.
      // If periodItems is empty, periodBankItems will be empty.
      // If periodItems has items for *other banks* but not this one, periodBankItems for *this bank* is empty.
      // This means previousBalance should be currentBalance in this case.

      // Let's refine periodItems to be truly empty for Bank A for this period for clarity
       const periodItemsClear: FinancialItem[] = [];
       const resultClear = useCalculatedBankBalances(availableBanks, bankBalances, allItems, periodItemsClear);
       const bankADataClear = findBankData(resultClear, "Bank A");
       expect(bankADataClear.balance).toBe(150);
       expect(bankADataClear.previousBalance).toBe(150); // As per logic for empty periodBankItems

    });
  });

  describe('Scenario 3: Initial balance, transactions only in period', () => {
    it('should calculate balances correctly', () => {
      const availableBanks = ["Bank B"];
      const bankBalances = [{ bank_name: "Bank B", initial_balance: 200 }];
      const allItems = [
        mockFinancialItem("2023-10-05", "Bank B", "saida", 50),
      ];
      const periodItems = [ // Assuming period starts Oct 1
        mockFinancialItem("2023-10-05", "Bank B", "saida", 50),
      ];

      const result = useCalculatedBankBalances(availableBanks, bankBalances, allItems, periodItems);
      const bankBData = findBankData(result, "Bank B");

      expect(bankBData.balance).toBe(150); // 200 - 50
      expect(bankBData.previousBalance).toBe(200); // initialBalance, as no items *before* period start
    });
  });

  describe('Scenario 4: Initial balance, transactions before AND in period', () => {
    it('should calculate balances correctly', () => {
      const availableBanks = ["Bank C"];
      const bankBalances = [{ bank_name: "Bank C", initial_balance: 100 }];
      const allItems = [
        mockFinancialItem("2023-09-20", "Bank C", "entrada", 50), // before
        mockFinancialItem("2023-10-10", "Bank C", "saida", 30),   // in period
        mockFinancialItem("2023-10-12", "Bank C", "entrada", 100), // in period
      ];
      const periodItems = [ // Assuming period starts Oct 1
        mockFinancialItem("2023-10-01", "Bank C", "entrada", 0), // Dummy item to define period start for Bank C
        mockFinancialItem("2023-10-10", "Bank C", "saida", 30),
        mockFinancialItem("2023-10-12", "Bank C", "entrada", 100),
      ];

      // Refined periodItems to ensure periodStartDate is Oct 1 for Bank C
      const refinedPeriodItems = [
        mockFinancialItem("2023-10-10", "Bank C", "saida", 30),
        mockFinancialItem("2023-10-12", "Bank C", "entrada", 100),
         // Add a dummy item if needed to ensure period start is 2023-10-01
         mockFinancialItem("2023-10-01", "OtherBank", "entrada", 1)
      ];


      const result = useCalculatedBankBalances(availableBanks, bankBalances, allItems, refinedPeriodItems);
      const bankCData = findBankData(result, "Bank C");

      // currentBalance = initial (100) + item_sep (50) - item_oct1 (30) + item_oct2 (100) = 100 + 50 - 30 + 100 = 220
      expect(bankCData.balance).toBe(220);
      // previousBalance = initial (100) + item_sep (50) = 150
      // This assumes period starts on Oct 1st. The items in periodItems for Bank C are 10th and 12th.
      // So periodStartDate will be Oct 10th.
      // Items before Oct 10th for Bank C: "2023-09-20" (50)
      // previousBalance = 100 (initial) + 50 = 150. This is correct.
      expect(bankCData.previousBalance).toBe(150);
    });
  });

  describe('Scenario 5: Multiple Banks', () => {
    it('should calculate balances correctly for each bank', () => {
      const availableBanks = ["Bank X", "Bank Y"];
      const bankBalances = [
        { bank_name: "Bank X", initial_balance: 1000 },
        { bank_name: "Bank Y", initial_balance: 500 },
      ];
      const allItems = [
        mockFinancialItem("2023-09-01", "Bank X", "entrada", 100), // Bank X, before period
        mockFinancialItem("2023-10-05", "Bank X", "saida", 50),   // Bank X, in period
        mockFinancialItem("2023-10-08", "Bank Y", "entrada", 200), // Bank Y, in period
      ];
      const periodItems = [ // Assuming period Oct 1-31
        mockFinancialItem("2023-10-05", "Bank X", "saida", 50),
        mockFinancialItem("2023-10-08", "Bank Y", "entrada", 200),
        // Add a dummy item to ensure period starts Oct 1st if not already covered
        mockFinancialItem("2023-10-01", "SomeOtherBank", "entrada", 1)
      ];

      const result = useCalculatedBankBalances(availableBanks, bankBalances, allItems, periodItems);
      const bankXData = findBankData(result, "Bank X");
      const bankYData = findBankData(result, "Bank Y");

      // Bank X
      // currentBalance = initial (1000) + item_sep (100) - item_oct (50) = 1050
      expect(bankXData.balance).toBe(1050);
      // periodItems for Bank X: "2023-10-05". So periodStartDate for Bank X is Oct 5th.
      // Items before Oct 5th for Bank X: "2023-09-01" (100)
      // previousBalance for Bank X = initial (1000) + item_sep (100) = 1100
      expect(bankXData.previousBalance).toBe(1100);

      // Bank Y
      // currentBalance = initial (500) + item_oct (200) = 700
      expect(bankYData.balance).toBe(700);
      // periodItems for Bank Y: "2023-10-08". So periodStartDate for Bank Y is Oct 8th.
      // Items before Oct 8th for Bank Y: None
      // previousBalance for Bank Y = initial (500) + 0 = 500
      expect(bankYData.previousBalance).toBe(500);
    });
  });

  describe('Scenario 6: Empty periodItems (globally)', () => {
    it('should set previousBalance to currentBalance', () => {
      const availableBanks = ["Bank Z"];
      const bankBalances = [{ bank_name: "Bank Z", initial_balance: 50 }];
      const allItems = [
        mockFinancialItem("2023-09-10", "Bank Z", "entrada", 100),
      ];
      const periodItems: FinancialItem[] = []; // Globally empty periodItems

      const result = useCalculatedBankBalances(availableBanks, bankBalances, allItems, periodItems);
      const bankZData = findBankData(result, "Bank Z");

      // currentBalance = initial (50) + all movement (100) = 150
      expect(bankZData.balance).toBe(150);
      // If periodItems is empty, periodBankItems will be empty.
      // Logic: if periodBankItems is empty, previousBalance = currentBalance.
      expect(bankZData.previousBalance).toBe(150);
    });
  });

  describe('Scenario 7: periodItems exist but not for the specific bank', () => {
    it('should calculate previousBalance as currentBalance for that bank', () => {
      const availableBanks = ["Bank Alpha", "Bank Beta"];
      const bankBalances = [
        { bank_name: "Bank Alpha", initial_balance: 100 },
        { bank_name: "Bank Beta", initial_balance: 200 }
      ];
      const allItems = [
        mockFinancialItem("2023-09-05", "Bank Alpha", "entrada", 50), // Alpha, before period
        mockFinancialItem("2023-10-10", "Bank Beta", "entrada", 25),  // Beta, in period
      ];
      const periodItems = [ // Period defined by Bank Beta's item
        mockFinancialItem("2023-10-10", "Bank Beta", "entrada", 25),
      ];

      const result = useCalculatedBankBalances(availableBanks, bankBalances, allItems, periodItems);
      const bankAlphaData = findBankData(result, "Bank Alpha");
      const bankBetaData = findBankData(result, "Bank Beta");

      // Bank Alpha
      // currentBalance = initial (100) + item_sep (50) = 150
      expect(bankAlphaData.balance).toBe(150);
      // periodBankItems for Bank Alpha is empty because periodItems has no items for Bank Alpha.
      // So, previousBalance for Bank Alpha should be currentBalance.
      expect(bankAlphaData.previousBalance).toBe(150);

      // Bank Beta
      // currentBalance = initial (200) + item_oct (25) = 225
      expect(bankBetaData.balance).toBe(225);
      // periodItems for Bank Beta: "2023-10-10". Period start for Beta is Oct 10th.
      // Items before Oct 10th for Bank Beta: None.
      // previousBalance for Bank Beta = initial (200) + 0 = 200
      expect(bankBetaData.previousBalance).toBe(200);
    });
  });

  describe('Scenario 8: Transactions on the exact period start date', () => {
    it('should not include transactions on period start date in previousBalance calculation', () => {
      const availableBanks = ["Bank D"];
      const bankBalances = [{ bank_name: "Bank D", initial_balance: 100 }];
      const allItems = [
        mockFinancialItem("2023-09-15", "Bank D", "entrada", 50), // Before period
        mockFinancialItem("2023-10-01", "Bank D", "entrada", 75), // On period start
        mockFinancialItem("2023-10-05", "Bank D", "saida", 25),   // In period
      ];
      // periodItems defines the period. Let's say period starts Oct 1st.
      // The crucial part is how periodStartDate is determined. It's min(date) from periodBankItems.
      const periodItems = [
        mockFinancialItem("2023-10-01", "Bank D", "entrada", 75),
        mockFinancialItem("2023-10-05", "Bank D", "saida", 25),
      ];

      const result = useCalculatedBankBalances(availableBanks, bankBalances, allItems, periodItems);
      const bankDData = findBankData(result, "Bank D");

      // currentBalance = 100 (initial) + 50 (Sept) + 75 (Oct 1st) - 25 (Oct 5th) = 200
      expect(bankDData.balance).toBe(200);

      // periodBankItems for Bank D are from "2023-10-01" and "2023-10-05".
      // So, periodStartDate will be new Date("2023-10-01").
      // itemsBeforePeriod filters items with itemDate.getTime() < periodStartDate.getTime().
      // So, the item on "2023-10-01" is NOT < periodStartDate.
      // movementBeforePeriod should only include the item from "2023-09-15".
      // previousBalance = 100 (initial) + 50 (item from Sept) = 150.
      expect(bankDData.previousBalance).toBe(150);
    });
  });

});

// Mock for FinancialItem type if not already available globally for tests
// For this subtask, we assume FinancialItem is correctly imported from '@/types/financial'
// If not, we might need to define it here:
/*
interface FinancialItem {
  id: string;
  user_id: string;
  date: string; // "YYYY-MM-DD"
  description: string;
  amount: number;
  type: 'entrada' | 'saida';
  bank: string;
  category?: string;
  created_at: string;
  source?: string;
  status?: string;
  related_transfer_id?: string;
  // Add any other fields that useCalculatedBankBalances might implicitly rely on,
  // though based on the hook code, it primarily uses date, bank, type, amount, source.
}
*/
