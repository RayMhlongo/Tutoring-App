import { TABLES } from "./config.js";
import { listRecords, saveRecord } from "./storage.js";
import { monthKey, sanitizeNumber, sanitizeText, uid } from "./utils.js";
import { validatePaymentPayload, requiredIsoDate } from "./validation.js";

export async function createPayment(payload, accountId) {
  const validated = validatePaymentPayload({
    ...payload,
    date: payload.date || new Date().toISOString().slice(0, 10)
  });
  const studentId = validated.studentId;
  const amountDue = validated.amountDue;
  const amountPaid = validated.amountPaid;
  const balance = Number((amountDue - amountPaid).toFixed(2));

  const record = {
    id: payload.id || uid("pay"),
    studentId,
    amountDue,
    amountPaid,
    balance,
    date: validated.date,
    method: sanitizeText(payload.method || "EFT", 40),
    notes: sanitizeText(payload.notes, 2000),
    status: balance <= 0 ? "paid" : "outstanding"
  };
  return saveRecord(TABLES.payments, record, { accountId, queue: true, op: "upsert" });
}

export async function listPayments(accountId) {
  return listRecords(TABLES.payments, accountId);
}

export async function getOutstandingPayments(accountId) {
  const rows = await listPayments(accountId);
  return rows.filter((row) => Number(row.balance || 0) > 0);
}

export async function getOutstandingByStudent(accountId) {
  const rows = await getOutstandingPayments(accountId);
  return rows.reduce((acc, row) => {
    const existing = acc[row.studentId] || 0;
    acc[row.studentId] = Number((existing + Number(row.balance || 0)).toFixed(2));
    return acc;
  }, {});
}

export async function createExpense(payload, accountId) {
  const amount = sanitizeNumber(payload.amount, 0);
  if (amount <= 0) throw new Error("Expense amount must be greater than zero.");

  const date = requiredIsoDate(payload.date || new Date().toISOString().slice(0, 10), "Expense date");
  const record = {
    id: payload.id || uid("exp"),
    date,
    month: monthKey(date),
    amount,
    category: sanitizeText(payload.category || "Supplies", 80),
    notes: sanitizeText(payload.notes, 2000)
  };
  return saveRecord(TABLES.expenses, record, { accountId, queue: true, op: "upsert" });
}

export async function listExpenses(accountId) {
  return listRecords(TABLES.expenses, accountId);
}
