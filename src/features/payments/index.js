import { paymentsRepo } from "../../data/repos/index.js";
import { renderCrudModule, bindCrudModule, field, selectField } from "../../ui/components/crudView.js";
import { escapeHtml, toast } from "../../ui/components/primitives.js";
import { formatCurrency, toNumber } from "../../utils/common.js";
import { getSettings } from "../../data/db/client.js";
import { getState, updateFilter } from "../../app/store.js";

const KEY = "payments";

export async function renderPayments() {
  const filter = getState().filters[KEY] || { search: "", includeArchived: false };
  const rows = filter.search ? await paymentsRepo.search(filter.search) : await paymentsRepo.list({ includeArchived: filter.includeArchived });
  const settings = await getSettings();
  const tableRows = rows.map((p) => {
    const balance = toNumber(p.amountDue) - toNumber(p.amountPaid);
    return [
      escapeHtml(p.date || ""),
      escapeHtml(p.studentId || ""),
      formatCurrency(p.amountDue, settings.currency),
      formatCurrency(p.amountPaid, settings.currency),
      formatCurrency(balance, settings.currency),
      escapeHtml(p.method || ""),
      escapeHtml(p.status || ""),
      p.archivedAt ? "Archived" : `<button class="btn btn-xs" data-archive-id="${escapeHtml(p.id)}">Archive</button>`
    ];
  });

  return renderCrudModule({
    title: "Payments",
    description: "Track paid, partial, unpaid, and overdue balances.",
    formId: "paymentsForm",
    fields: [
      field("Date", "date", "", "date", "required"),
      field("Student ID", "studentId", "", "text", "required"),
      field("Amount due", "amountDue", "0", "number", "step='0.01' min='0'"),
      field("Amount paid", "amountPaid", "0", "number", "step='0.01' min='0'"),
      field("Method", "method", "EFT"),
      field("Reference", "reference"),
      selectField("Status", "status", ["paid", "partial", "unpaid", "overdue"], "paid")
    ],
    records: tableRows,
    columns: ["Date", "Student", "Due", "Paid", "Balance", "Method", "Status", "Actions"],
    search: filter.search,
    includeArchive: filter.includeArchived,
    createLabel: "Record payment"
  });
}

export function bindPayments(root, rerender) {
  const filter = getState().filters[KEY] || { search: "", includeArchived: false };
  bindCrudModule({
    root,
    formId: "paymentsForm",
    onSubmit: async (payload) => {
      try {
        await paymentsRepo.create(payload);
        toast("Payment saved.", "success");
      } catch (error) {
        toast(error.message, "error");
      }
      await rerender();
    },
    onSearchChange: (search) => {
      updateFilter(KEY, { ...filter, search });
      rerender();
    },
    onArchiveToggle: (includeArchived) => {
      updateFilter(KEY, { ...filter, includeArchived });
      rerender();
    },
    onArchiveClick: async (id) => {
      await paymentsRepo.archive(id);
      toast("Payment archived.", "info");
      await rerender();
    }
  });
}