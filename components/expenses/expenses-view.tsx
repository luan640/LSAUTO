"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { ExpenseFormDialog } from "./expense-form-dialog";
import type { Expense } from "@/lib/types";

export function ExpensesView({ expenses }: { expenses: Expense[] }) {
  const [open, setOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  function openNew() {
    setEditingExpense(null);
    setOpen(true);
  }

  function openEdit(expense: Expense) {
    setEditingExpense(expense);
    setOpen(true);
  }

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      if (dateFrom && expense.end_date < dateFrom) return false;
      if (dateTo && expense.start_date > dateTo) return false;
      return true;
    });
  }, [expenses, dateFrom, dateTo]);

  const totalAmount = filteredExpenses.reduce((acc, expense) => acc + expense.amount, 0);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold md:text-2xl">Despesas</h1>
        <Button onClick={openNew}>
          <Plus className="size-4" />
          Nova despesa
        </Button>
      </div>

      {expenses.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma despesa registrada ainda.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="grid grid-cols-2 gap-3 py-4 md:grid-cols-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="filter_date_from">De</Label>
                <DateInput id="filter_date_from" onValueChange={setDateFrom} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="filter_date_to">Até</Label>
                <DateInput id="filter_date_to" onValueChange={setDateTo} />
              </div>
            </CardContent>
          </Card>

          {/* Mobile: total */}
          <div className="flex items-center justify-between md:hidden">
            <span className="text-sm font-medium text-muted-foreground">Total</span>
            <span className="text-base font-semibold">{formatCurrency(totalAmount)}</span>
          </div>

          {filteredExpenses.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nenhuma despesa encontrada para os filtros selecionados.
              </CardContent>
            </Card>
          )}

          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filteredExpenses.map((expense) => (
              <Card
                key={expense.id}
                className="cursor-pointer"
                onClick={() => openEdit(expense)}
              >
                <CardContent className="flex flex-col gap-1 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{expense.description}</span>
                    <span className="text-base font-semibold">
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(expense.start_date)} a {formatDate(expense.end_date)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow
                    key={expense.id}
                    className="cursor-pointer"
                    onClick={() => openEdit(expense)}
                  >
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>
                      {formatDate(expense.start_date)} a {formatDate(expense.end_date)}
                    </TableCell>
                    <TableCell>{formatCurrency(expense.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Total</TableCell>
                  <TableCell />
                  <TableCell>{formatCurrency(totalAmount)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </>
      )}

      <ExpenseFormDialog open={open} onOpenChange={setOpen} expense={editingExpense} />
    </div>
  );
}
