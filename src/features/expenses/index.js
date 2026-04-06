import { expensesRepo } from "../../data/repos/index.js";
import { renderCrudModule, bindCrudModule, field } from "../../ui/components/crudView.js";
import { escapeHtml, toast } from "../../ui/components/primitives.js";
import { formatCurrency } from "../../utils/common.js";
import { getSettings } from "../../data/db/client.js";
import { getState, updateFilter } from "../../app/store.js";

const KEY = "expenses";

export async function renderExpenses() {
  const filter = getState().filters[KEY] || { search: "", includeArchived: false };
  const rows = filter.search ? await expensesRepo.search(filter.search) : await expensesRepo.list({ includeArchived: filter.includeArchived });
  const settings = await getSettings();
  const tableRows = rows.map((e) => [
    escapeHtml(e.date || ""),
    escapeHtml(e.category || ""),
    formatCurrency(e.amount, settings.currency),
    escapeHtml(e.notes || ""),
    e.archivedAt ? "Archived" : `<button class="btn btn-xs" data-archive-id="${escapeHtml(e.id)}">Archive</button>`
  ]);

  return renderCrudModule({
    title: "Expenses",
    description: "Track operating expenses and monthly totals.",
    formId: "expensesForm",
    fields: [
      field("Date", "date", "", "date", "required"),
      field("Category", "category", "", "text", "required"),
      field("Amount", "amount", "0", "number", "step='0.01' min='0'"),
      field("Notes", "notes", "", "textarea")
    ],
    records: tableRows,
    columns: ["Date", "Category", "Amount", "Notes", "Actions"],
    search: filter.search,
    includeArchive: filter.includeArchived,
    createLabel: "Add expense"
  });
}

export function bindExpenses(root, rerender) {
  const filter = getState().filters[KEY] || { search: "", includeArchived: false };
  bindCrudModule({
    root,
    formId: "expensesForm",
    onSubmit: async (payload) => {
      try {
        await expensesRepo.create(payload);
        toast("Expense saved.", "success");
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
      await expensesRepo.archive(id);
      toast("Expense archived.", "info");
      await rerender();
    }
  });
}