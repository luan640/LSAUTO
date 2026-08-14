"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { BalanceAdjustmentFormDialog } from "./balance-adjustment-form-dialog";
import type { LsBalanceAdjustment } from "@/lib/types";

function formatDateTime(isoDate: string) {
  return format(parseISO(isoDate), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function BalanceAdjustmentsView({
  adjustments,
}: {
  adjustments: LsBalanceAdjustment[];
}) {
  const [open, setOpen] = useState(false);
  const [editingAdjustment, setEditingAdjustment] = useState<LsBalanceAdjustment | null>(null);

  function openNew() {
    setEditingAdjustment(null);
    setOpen(true);
  }

  function openEdit(adjustment: LsBalanceAdjustment) {
    setEditingAdjustment(adjustment);
    setOpen(true);
  }

  const totalAmount = adjustments.reduce((acc, adjustment) => acc + adjustment.amount, 0);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold md:text-2xl">Ajuste Monetário</h1>
        <Button onClick={openNew}>
          <Plus className="size-4" />
          Novo ajuste
        </Button>
      </div>

      {adjustments.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum ajuste registrado ainda.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: total */}
          <div className="flex items-center justify-between md:hidden">
            <span className="text-sm font-medium text-muted-foreground">Total</span>
            <span
              className={cn(
                "text-base font-semibold",
                totalAmount < 0 && "text-destructive",
              )}
            >
              {formatCurrency(totalAmount)}
            </span>
          </div>

          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {adjustments.map((adjustment) => (
              <Card
                key={adjustment.id}
                className="cursor-pointer"
                onClick={() => openEdit(adjustment)}
              >
                <CardContent className="flex flex-col gap-1 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{adjustment.description}</span>
                    <span
                      className={cn(
                        "text-base font-semibold",
                        adjustment.amount < 0 && "text-destructive",
                      )}
                    >
                      {formatCurrency(adjustment.amount)}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDateTime(adjustment.created_at)}
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
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((adjustment) => (
                  <TableRow
                    key={adjustment.id}
                    className="cursor-pointer"
                    onClick={() => openEdit(adjustment)}
                  >
                    <TableCell>{adjustment.description}</TableCell>
                    <TableCell>{formatDateTime(adjustment.created_at)}</TableCell>
                    <TableCell
                      className={cn(adjustment.amount < 0 && "text-destructive")}
                    >
                      {formatCurrency(adjustment.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Total</TableCell>
                  <TableCell />
                  <TableCell className={cn(totalAmount < 0 && "text-destructive")}>
                    {formatCurrency(totalAmount)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </>
      )}

      <BalanceAdjustmentFormDialog
        open={open}
        onOpenChange={setOpen}
        adjustment={editingAdjustment}
      />
    </div>
  );
}
