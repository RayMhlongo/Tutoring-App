import { scheduleRepo } from "../../data/repos/index.js";
import { renderCrudModule, bindCrudModule, field, selectField } from "../../ui/components/crudView.js";
import { escapeHtml, toast, card, emptyState } from "../../ui/components/primitives.js";
import { getState, updateFilter } from "../../app/store.js";

const KEY = "schedule";

function parseDate(value) {
  return new Date(`${value}T00:00:00`);
}

function isoDate(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function inRange(date, start, end) {
  const d = parseDate(date).getTime();
  return d >= start.getTime() && d <= end.getTime();
}

function toMinutes(timeText) {
  const raw = String(timeText || "");
  const [h, m] = raw.split(":").map((value) => Number(value));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return (h * 60) + m;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  const as = toMinutes(aStart);
  const ae = toMinutes(aEnd);
  const bs = toMinutes(bStart);
  const be = toMinutes(bEnd);
  if (as === null || ae === null || bs === null || be === null) return false;
  return as < be && bs < ae;
}

function getRange(mode, focusDate) {
  const base = parseDate(focusDate);
  if (mode === "day") return { start: base, end: base };

  if (mode === "week") {
    const day = base.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = new Date(base);
    start.setDate(start.getDate() + mondayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }

  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return { start, end };
}

function enumerateDates(start, end) {
  const out = [];
  const cur = new Date(start);
  while (cur.getTime() <= end.getTime()) {
    out.push(isoDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function renderCalendarBlocks(rows, mode, focusDate) {
  const { start, end } = getRange(mode, focusDate);
  const visibleDays = enumerateDates(start, end);
  const scoped = rows.filter((row) => !row.archivedAt && inRange(row.date, start, end));

  const grouped = new Map();
  visibleDays.forEach((day) => grouped.set(day, []));
  scoped.forEach((row) => {
    const key = row.date;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  });

  const dayCards = visibleDays.map((day) => {
    const events = grouped.get(day) || [];
    return `
      <section class="calendar-day" data-drop-date="${escapeHtml(day)}">
        <header>${escapeHtml(day)}</header>
        <div class="calendar-events">
          ${events.length
            ? events
              .sort((a, b) => (a.startTime > b.startTime ? 1 : -1))
              .map((event) => `
                <article class="event-card" draggable="true" data-event-id="${escapeHtml(event.id)}" style="--event:${escapeHtml(event.color || "#0d9f8f")}">
                  <p><strong>${escapeHtml(event.startTime || "--:--")}</strong> - ${escapeHtml(event.endTime || "--:--")}</p>
                  <p>${escapeHtml(event.lessonType || "Lesson")}</p>
                  <p>Student: ${escapeHtml(event.studentId || "-")}</p>
                  <p>Tutor: ${escapeHtml(event.tutorId || "-")}</p>
                  <p class="muted">${escapeHtml(event.status || "planned")}</p>
                </article>
              `)
              .join("")
            : `<div class="drop-hint">Drop event here to reschedule</div>`}
        </div>
      </section>
    `;
  }).join("");

  if (!dayCards) return emptyState("No schedule events in selected range.");
  return `<div class="calendar-grid">${dayCards}</div>`;
}

export async function renderSchedule() {
  const filter = getState().filters[KEY] || { search: "", includeArchived: false, mode: "week", focusDate: isoDate(new Date()) };
  const rows = filter.search ? await scheduleRepo.search(filter.search) : await scheduleRepo.list({ includeArchived: filter.includeArchived });
  const tableRows = rows.map((e) => [
    escapeHtml(e.date || ""),
    escapeHtml(e.startTime || ""),
    escapeHtml(e.endTime || ""),
    escapeHtml(e.studentId || ""),
    escapeHtml(e.tutorId || ""),
    `<span class="status-dot" style="--dot:${escapeHtml(e.color || "#0d9f8f")}"></span>${escapeHtml(e.status || "planned")}`,
    e.archivedAt ? "Archived" : `<button class="btn btn-xs" data-archive-id="${escapeHtml(e.id)}">Archive</button>`
  ]);

  const planner = card(
    "Schedule Planner",
    `
      <div class="toolbar">
        <button class="btn btn-ghost ${filter.mode === "day" ? "active-mode" : ""}" type="button" data-mode="day">Day</button>
        <button class="btn btn-ghost ${filter.mode === "week" ? "active-mode" : ""}" type="button" data-mode="week">Week</button>
        <button class="btn btn-ghost ${filter.mode === "month" ? "active-mode" : ""}" type="button" data-mode="month">Month</button>
        <label class="field field-inline"><span>Focus date</span><input id="scheduleFocusDate" class="input" type="date" value="${escapeHtml(filter.focusDate)}"></label>
      </div>
      <p class="muted">Tip: drag an event card and drop it on another date to reschedule.</p>
      ${renderCalendarBlocks(rows, filter.mode, filter.focusDate)}
    `
  );

  return `${planner}${renderCrudModule({
    title: "Schedule Records",
    description: "Book lessons with tutor and student allocation.",
    formId: "scheduleForm",
    fields: [
      field("Date", "date", "", "date", "required"),
      field("Start", "startTime", "", "time", "required"),
      field("End", "endTime", "", "time", "required"),
      field("Student ID", "studentId", "", "text", "required"),
      field("Tutor ID", "tutorId", "", "text", "required"),
      field("Lesson Type", "lessonType"),
      selectField("Status", "status", ["planned", "completed", "missed", "cancelled"], "planned"),
      field("Color", "color", "#0d9f8f", "color")
    ],
    records: tableRows,
    columns: ["Date", "Start", "End", "Student", "Tutor", "Status", "Actions"],
    search: filter.search,
    includeArchive: filter.includeArchived,
    createLabel: "Add event"
  })}`;
}

export function bindSchedule(root, rerender) {
  const filter = getState().filters[KEY] || { search: "", includeArchived: false, mode: "week", focusDate: isoDate(new Date()) };

  root.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      updateFilter(KEY, { ...filter, mode: button.dataset.mode });
      rerender();
    });
  });

  root.querySelector("#scheduleFocusDate")?.addEventListener("change", (event) => {
    updateFilter(KEY, { ...filter, focusDate: event.target.value || isoDate(new Date()) });
    rerender();
  });

  root.querySelectorAll("[data-event-id]").forEach((cardEl) => {
    cardEl.addEventListener("dragstart", (event) => {
      event.dataTransfer?.setData("text/plain", cardEl.dataset.eventId || "");
      event.dataTransfer.effectAllowed = "move";
      cardEl.classList.add("dragging");
    });
    cardEl.addEventListener("dragend", () => {
      cardEl.classList.remove("dragging");
      root.querySelectorAll(".calendar-day.is-drop-target").forEach((el) => el.classList.remove("is-drop-target"));
    });
  });

  root.querySelectorAll("[data-drop-date]").forEach((dropEl) => {
    dropEl.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropEl.classList.add("is-drop-target");
    });
    dropEl.addEventListener("dragleave", () => {
      dropEl.classList.remove("is-drop-target");
    });
    dropEl.addEventListener("drop", async (event) => {
      event.preventDefault();
      dropEl.classList.remove("is-drop-target");
      const id = event.dataTransfer?.getData("text/plain") || "";
      const nextDate = dropEl.dataset.dropDate || "";
      if (!id || !nextDate) return;
      try {
        const current = await scheduleRepo.getById(id);
        if (!current || current.archivedAt) return;
        if (current.date === nextDate) return;
        const allRows = await scheduleRepo.list();
        const conflicts = allRows
          .filter((row) => row.id !== current.id)
          .filter((row) => row.date === nextDate)
          .filter((row) => !row.archivedAt)
          .filter((row) => overlaps(current.startTime, current.endTime, row.startTime, row.endTime))
          .filter((row) => row.studentId === current.studentId || row.tutorId === current.tutorId);

        if (conflicts.length) {
          const details = conflicts
            .slice(0, 3)
            .map((row) => `${row.startTime}-${row.endTime} | Student ${row.studentId || "-"} | Tutor ${row.tutorId || "-"}`)
            .join("\n");
          const proceed = window.confirm(
            `Scheduling conflict detected (${conflicts.length}).\n\n${details}\n\nMove anyway?`
          );
          if (!proceed) {
            toast("Reschedule cancelled due to conflict.", "warn");
            return;
          }
        }
        await scheduleRepo.update(id, { ...current, date: nextDate });
        toast(`Event moved to ${nextDate}.`, "success");
        await rerender();
      } catch (error) {
        toast(error.message || "Reschedule failed.", "error");
      }
    });
  });

  bindCrudModule({
    root,
    formId: "scheduleForm",
    onSubmit: async (payload) => {
      try {
        await scheduleRepo.create(payload);
        toast("Schedule event added.", "success");
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
      await scheduleRepo.archive(id);
      toast("Event archived.", "info");
      await rerender();
    }
  });
}
