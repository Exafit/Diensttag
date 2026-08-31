"use strict";

const STORAGE_KEY = "aussenzeit.entries.v1";
const DAY_RECORDS_KEY = "aussenzeit.dayRecords.v1";
const SETTINGS_KEY = "aussenzeit.settings.v1";
const SAMSUNG_INSTALL_NOTICE_KEY = "aussenzeit.samsungInstallNoticeDismissed.v1";
const DAY_MS = 24 * 60 * 60 * 1000;

const CATEGORY_LABELS = {
  OVER_8H: ">8h",
  FULL_24H: "24h",
  ARRIVAL_DAY: "Anreisetag",
  DEPARTURE_DAY: "Abreisetag",
};

const DOMESTIC_ALLOWANCES = {
  OVER_8H: 14,
  FULL_24H: 28,
  ARRIVAL_DAY: 14,
  DEPARTURE_DAY: 14,
};

const FOREIGN_ALLOWANCES = {
  Belgien: { short: 40, full: 59 },
  Frankreich: { short: 39, full: 58 },
  Luxemburg: { short: 40, full: 59 },
  Niederlande: { short: 32, full: 47 },
  Österreich: { short: 27, full: 40 },
  Polen: { short: 22, full: 33 },
  Schweiz: { short: 43, full: 64 },
  Spanien: { short: 29, full: 44 },
  "Vereinigtes Königreich": { short: 41, full: 62 },
  USA: { short: 44, full: 66 },
};

const state = {
  entries: loadJson(STORAGE_KEY, []),
  dayRecords: normalizeDayRecords(loadJson(DAY_RECORDS_KEY, [])),
  settings: loadJson(SETTINGS_KEY, { showAmounts: true }),
  selectedDate: startOfDay(new Date()),
  selectedCategory: "OVER_8H",
  selectedRegion: "DOMESTIC",
  selectedCountry: "Frankreich",
  selectedFilter: "ALL",
  selectedWorkFilter: "WORKDAY",
  overviewMode: "WORK",
  overviewYear: new Date().getFullYear(),
  selectionMode: false,
  selectedIds: new Set(),
  tripRegion: "DOMESTIC",
  absenceFormExpanded: false,
  deferredInstallPrompt: null,
  samsungInstallNoticeDismissed: loadJson(SAMSUNG_INSTALL_NOTICE_KEY, false),
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  hydrateCountries();
  bindEvents();
  configureInstallExperience();
  renderAll();
  registerServiceWorker();
});

function cacheElements() {
  [
    "dateWheel",
    "installApp",
    "samsungInstallNotice",
    "samsungInstallText",
    "openInChrome",
    "dismissInstallNotice",
    "todayShortcut",
    "selectedDateLabel",
    "selectedDateMeta",
    "commuteQuestion",
    "absenceGate",
    "absenceGateText",
    "openAbsenceForm",
    "absenceForm",
    "foreignFields",
    "countrySelect",
    "locationInput",
    "noteInput",
    "toggleEntry",
    "yearCount",
    "yearWorkdayCount",
    "yearCommuteCount",
    "yearAmount",
    "overviewTitle",
    "overviewCount",
    "overviewWorkdayCount",
    "overviewCommuteCount",
    "overviewAmount",
    "summaryGrid",
    "entryList",
    "filterRow",
    "prevYear",
    "nextYear",
    "tripAssistant",
    "exportCsv",
    "selectionMode",
    "showAmounts",
    "exportBackup",
    "importBackup",
    "tripDialog",
    "tripForm",
    "tripTitle",
    "tripStart",
    "tripEnd",
    "tripForeignFields",
    "tripCountry",
    "tripLocation",
    "tripNote",
    "confirmDialog",
    "confirmText",
    "confirmDelete",
    "toast",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function hydrateCountries() {
  const options = Object.keys(FOREIGN_ALLOWANCES)
    .sort((a, b) => a.localeCompare(b, "de"))
    .map((country) => `<option value="${escapeHtml(country)}">${escapeHtml(country)}</option>`)
    .join("");
  els.countrySelect.innerHTML = options;
  els.tripCountry.innerHTML = options;
  els.countrySelect.value = state.selectedCountry;
  els.tripCountry.value = state.selectedCountry;
}

function bindEvents() {
  document.querySelectorAll(".bottom-nav button").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  els.todayShortcut.addEventListener("click", () => {
    state.selectedDate = startOfDay(new Date());
    state.absenceFormExpanded = false;
    loadFormFromSelectedDate();
    renderAll();
    scrollSelectedIntoView();
  });
  els.installApp.addEventListener("click", installApp);
  els.openInChrome.addEventListener("click", openInChrome);
  els.dismissInstallNotice.addEventListener("click", () => {
    state.samsungInstallNoticeDismissed = true;
    try {
      localStorage.setItem(SAMSUNG_INSTALL_NOTICE_KEY, JSON.stringify(true));
    } catch {
      // The notice still closes for this session if browser storage is unavailable.
    }
    els.samsungInstallNotice.hidden = true;
  });
  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleAppInstalled);

  document.querySelectorAll("[data-workday-status]").forEach((button) => {
    button.addEventListener("click", () => setWorkdayStatus(button.dataset.workdayStatus));
  });

  document.querySelectorAll("[data-commute-status]").forEach((button) => {
    button.addEventListener("click", () => setCommuteStatus(button.dataset.commuteStatus));
  });

  els.openAbsenceForm.addEventListener("click", () => {
    state.absenceFormExpanded = true;
    renderHome();
  });

  document.querySelectorAll("[data-overview-mode]").forEach((button) => {
    button.addEventListener("click", () => setOverviewMode(button.dataset.overviewMode));
  });

  document.querySelectorAll("[data-region]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedRegion = button.dataset.region;
      renderHome();
    });
  });

  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedCategory = button.dataset.category;
      renderHome();
    });
  });

  els.countrySelect.addEventListener("change", () => {
    state.selectedCountry = els.countrySelect.value;
    renderHome();
  });
  els.locationInput.addEventListener("input", updateHomeAction);
  els.noteInput.addEventListener("input", updateHomeAction);

  els.toggleEntry.addEventListener("click", toggleSelectedEntry);
  els.prevYear.addEventListener("click", () => changeYear(-1));
  els.nextYear.addEventListener("click", () => changeYear(1));
  els.exportCsv.addEventListener("click", exportCurrentYearCsv);
  els.selectionMode.addEventListener("click", toggleSelectionMode);
  els.tripAssistant.addEventListener("click", openTripDialog);
  els.showAmounts.addEventListener("change", updateSettings);
  els.exportBackup.addEventListener("click", exportBackup);
  els.importBackup.addEventListener("change", importBackup);

  document.querySelectorAll("[data-trip-region]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tripRegion = button.dataset.tripRegion;
      renderTripDialogRegion();
    });
  });

  els.tripForm.addEventListener("submit", (event) => {
    if (event.submitter && event.submitter.value === "cancel") return;
    event.preventDefault();
    createTripEntries();
  });

  els.confirmDialog.addEventListener("close", () => {
    if (els.confirmDialog.returnValue === "delete") {
      deleteSelectedEntries();
    }
  });
}

function renderAll() {
  renderHome();
  renderOverview();
  renderSettings();
}

function renderHome() {
  renderDateWheel();
  const dateKey = toIsoDate(state.selectedDate);
  const existing = findEntryForDate(dateKey);
  const dayRecord = findDayRecordForDate(dateKey);
  const selectedLabel = formatDateLong(state.selectedDate);
  const workdayStatus = dayRecord?.workdayStatus || "UNSET";
  const commuteStatus = dayRecord?.primaryWorkplaceVisited === true
    ? "YES"
    : dayRecord?.primaryWorkplaceVisited === false
      ? "NO"
      : "UNSET";
  const meta = [];

  if (workdayStatus === "WORKDAY") {
    meta.push("Arbeitstag");
    meta.push(commuteStatus === "YES" ? "Fahrtag" : commuteStatus === "NO" ? "keine Fahrt zur Tätigkeitsstätte" : "Fahrtangabe offen");
  } else if (workdayStatus === "NON_WORKDAY") {
    meta.push("Kein Arbeitstag");
  } else {
    meta.push("Arbeitstag offen");
  }

  if (existing) meta.push(`${CATEGORY_LABELS[existing.category]} · ${regionLabel(existing)}`);

  els.selectedDateLabel.textContent = selectedLabel;
  els.selectedDateMeta.textContent = meta.join(" · ");

  document.querySelectorAll("[data-workday-status]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.workdayStatus === workdayStatus);
  });

  document.querySelectorAll("[data-commute-status]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.commuteStatus === commuteStatus);
  });

  els.commuteQuestion.hidden = workdayStatus !== "WORKDAY";

  const showAbsenceForm = Boolean(existing) || workdayStatus === "WORKDAY" || state.absenceFormExpanded;
  els.absenceForm.hidden = !showAbsenceForm;
  els.absenceGate.hidden = showAbsenceForm;
  els.openAbsenceForm.hidden = workdayStatus !== "NON_WORKDAY";

  if (!showAbsenceForm) {
    els.absenceGateText.textContent = workdayStatus === "NON_WORKDAY"
      ? "Auch ohne regulären Arbeitstag kann ein Reise- oder 24h-Abwesenheitstag vorliegen."
      : "Bitte zuerst angeben, ob dieser Tag ein Arbeitstag war.";
  }

  document.querySelectorAll("[data-region]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.region === state.selectedRegion);
  });

  document.querySelectorAll("[data-category]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.category === state.selectedCategory);
  });

  els.foreignFields.hidden = state.selectedRegion !== "FOREIGN";
  els.countrySelect.value = state.selectedCountry;

  updateHomeAction();

  const yearEntries = getEntriesForYear(state.selectedDate.getFullYear());
  const yearDayRecords = getDayRecordsForYear(state.selectedDate.getFullYear());
  els.yearWorkdayCount.textContent = String(countWorkdays(yearDayRecords));
  els.yearCommuteCount.textContent = String(countCommuteDays(yearDayRecords));
  els.yearCount.textContent = String(yearEntries.length);
  els.yearAmount.textContent = state.settings.showAmounts ? `${sumAllowances(yearEntries)} €` : "aus";
}

function renderDateWheel() {
  const center = startOfDay(state.selectedDate);
  const days = [];
  for (let offset = -15; offset <= 15; offset += 1) {
    days.push(addDays(center, offset));
  }

  els.dateWheel.innerHTML = days
    .map((date) => {
      const iso = toIsoDate(date);
      const selected = iso === toIsoDate(state.selectedDate);
      const absence = Boolean(findEntryForDate(iso));
      const dayRecord = findDayRecordForDate(iso);
      const workday = dayRecord?.workdayStatus === "WORKDAY";
      const nonWorkday = dayRecord?.workdayStatus === "NON_WORKDAY";
      return `
        <button type="button" class="date-option${selected ? " selected" : ""}" data-date="${iso}">
          <small>${formatWeekdayShort(date)}</small>
          <strong>${date.getDate()}</strong>
          <span class="month-label">${formatMonthShort(date)}</span>
          <span class="date-markers" aria-hidden="true">
            ${workday ? '<i class="workday-marker"></i>' : nonWorkday ? '<i class="non-workday-marker"></i>' : ""}
            ${absence ? '<i class="absence-marker"></i>' : ""}
          </span>
        </button>
      `;
    })
    .join("");

  els.dateWheel.querySelectorAll(".date-option").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDate = parseIsoDate(button.dataset.date);
      state.absenceFormExpanded = false;
      const existing = findEntryForDate(button.dataset.date);
      if (existing) {
        loadFormFromEntry(existing);
      } else {
        els.locationInput.value = "";
        els.noteInput.value = "";
      }
      renderHome();
      scrollSelectedIntoView();
    });
  });

  requestAnimationFrame(scrollSelectedIntoView);
}

function renderOverview() {
  const entries = getEntriesForYear(state.overviewYear);
  const dayRecords = getDayRecordsForYear(state.overviewYear);
  const visibleRecords = state.overviewMode === "WORK"
    ? filterDayRecords(dayRecords)
    : filterEntries(entries);
  els.overviewTitle.textContent = String(state.overviewYear);
  els.overviewWorkdayCount.textContent = String(countWorkdays(dayRecords));
  els.overviewCommuteCount.textContent = String(countCommuteDays(dayRecords));
  els.overviewCount.textContent = String(entries.length);
  els.overviewAmount.textContent = state.settings.showAmounts ? `${sumAllowances(entries)} € Vorschau` : "Beträge ausgeblendet";

  document.querySelectorAll("[data-overview-mode]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.overviewMode === state.overviewMode);
  });

  const counts = summarize(entries);
  els.summaryGrid.innerHTML = [
    ["OVER_8H", ">8h"],
    ["FULL_24H", "24h"],
    ["ARRIVAL_DAY", "Anreise"],
    ["DEPARTURE_DAY", "Abreise"],
  ]
    .map(([key, label]) => `
      <div class="summary-card">
        <strong>${counts[key] || 0}</strong>
        <small>${label}</small>
      </div>
    `)
    .join("");

  renderFilters(entries, dayRecords);

  if (!visibleRecords.length) {
    els.entryList.innerHTML = `<div class="empty-state">Keine Einträge für diese Auswahl.</div>`;
  } else {
    els.entryList.innerHTML = visibleRecords
      .map((record) => state.overviewMode === "WORK" ? renderDayRecordCard(record) : renderEntryCard(record))
      .join("");
  }

  els.entryList.querySelectorAll("[data-record-id]").forEach((card) => {
    const id = card.dataset.recordId;
    const type = card.dataset.recordType;
    const checkbox = card.querySelector(".entry-check");
    const editButton = card.querySelector("[data-edit]");

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) state.selectedIds.add(id);
      else state.selectedIds.delete(id);
      updateSelectionButton();
    });

    editButton.addEventListener("click", () => {
      if (type === "day") editDayRecord(id);
      else editEntry(id);
    });
  });

  updateSelectionButton();
}

function renderEntryCard(entry) {
  const date = parseIsoDate(entry.date);
  const allowance = state.settings.showAmounts ? ` · ${entry.allowanceAmount || 0} €` : "";
  const detail = `${CATEGORY_LABELS[entry.category]} · ${regionLabel(entry)}${allowance}`;
  const note = entry.note ? `<span>${escapeHtml(entry.note)}</span>` : "";
  return `
    <article class="entry-card" data-record-id="${entry.id}" data-record-type="absence">
      <input class="entry-check" type="checkbox" ${state.selectionMode ? "" : "hidden"} ${state.selectedIds.has(entry.id) ? "checked" : ""} aria-label="Eintrag auswählen">
      <div class="entry-main">
        <strong>${formatWeekdayShort(date)}, ${formatDateNumeric(date)}</strong>
        <small>${escapeHtml(detail)}</small>
        ${note}
      </div>
      <button type="button" data-edit aria-label="Bearbeiten" title="Bearbeiten">✎</button>
    </article>
  `;
}

function renderDayRecordCard(record) {
  const date = parseIsoDate(record.date);
  const detail = record.workdayStatus === "NON_WORKDAY"
    ? "Kein Arbeitstag"
    : record.primaryWorkplaceVisited === true
      ? "Arbeitstag · erste Tätigkeitsstätte aufgesucht"
      : record.primaryWorkplaceVisited === false
        ? "Arbeitstag · keine Fahrt zur ersten Tätigkeitsstätte"
        : "Arbeitstag · Fahrtangabe offen";

  return `
    <article class="entry-card" data-record-id="${record.id}" data-record-type="day">
      <input class="entry-check" type="checkbox" ${state.selectionMode ? "" : "hidden"} ${state.selectedIds.has(record.id) ? "checked" : ""} aria-label="Tagesstatus auswählen">
      <div class="entry-main">
        <strong>${formatWeekdayShort(date)}, ${formatDateNumeric(date)}</strong>
        <small>${escapeHtml(detail)}</small>
      </div>
      <button type="button" data-edit aria-label="Bearbeiten" title="Bearbeiten">✎</button>
    </article>
  `;
}

function renderFilters(entries, dayRecords) {
  const filters = state.overviewMode === "WORK"
    ? [
        ["ALL", "Alle"],
        ["WORKDAY", "Arbeitstage"],
        ["COMMUTE", "Fahrtage"],
        ["COMMUTE_OPEN", "Fahrt offen"],
        ["NON_WORKDAY", "Kein Arbeitstag"],
      ]
    : [
        ["ALL", "Alle"],
        ["DOMESTIC", "Inland"],
        ["FOREIGN", "Ausland"],
        ["OVER_8H", ">8h"],
        ["FULL_24H", "24h"],
        ["ARRIVAL_DAY", "Anreise"],
        ["DEPARTURE_DAY", "Abreise"],
      ];

  els.filterRow.innerHTML = filters
    .map(([key, label]) => {
      const count = state.overviewMode === "WORK"
        ? countDayRecordsForFilter(dayRecords, key)
        : key === "ALL"
          ? entries.length
          : entries.filter((entry) => entry.regionType === key || entry.category === key).length;
      const selectedFilter = state.overviewMode === "WORK" ? state.selectedWorkFilter : state.selectedFilter;
      return `<button type="button" class="${selectedFilter === key ? "selected" : ""}" data-filter="${key}">${label} ${count}</button>`;
    })
    .join("");

  els.filterRow.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.overviewMode === "WORK") state.selectedWorkFilter = button.dataset.filter;
      else state.selectedFilter = button.dataset.filter;
      renderOverview();
    });
  });
}

function renderSettings() {
  els.showAmounts.checked = Boolean(state.settings.showAmounts);
}

function renderTripDialogRegion() {
  document.querySelectorAll("[data-trip-region]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.tripRegion === state.tripRegion);
  });
  els.tripForeignFields.hidden = state.tripRegion !== "FOREIGN";
}

function switchView(view) {
  document.querySelectorAll(".view").forEach((section) => {
    section.classList.toggle("active", section.id === `view-${view}`);
  });
  document.querySelectorAll(".bottom-nav button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  if (view === "overview") renderOverview();
}

function setOverviewMode(mode) {
  if (!['WORK', 'ABSENCE'].includes(mode) || state.overviewMode === mode) return;
  state.overviewMode = mode;
  state.selectionMode = false;
  state.selectedIds.clear();
  renderOverview();
}

function setWorkdayStatus(status) {
  if (!["UNSET", "WORKDAY", "NON_WORKDAY"].includes(status)) return;
  const date = toIsoDate(state.selectedDate);
  const existing = findDayRecordForDate(date);

  if (status === "UNSET") {
    if (!existing) return;
    state.dayRecords = state.dayRecords.filter((record) => record.id !== existing.id);
    state.absenceFormExpanded = false;
    saveDayRecords();
    showToast("Arbeitstag-Angabe entfernt.");
    renderAll();
    return;
  }

  if (existing) {
    const wasWorkday = existing.workdayStatus === "WORKDAY";
    existing.workdayStatus = status;
    if (status === "NON_WORKDAY" || !wasWorkday) existing.primaryWorkplaceVisited = null;
    existing.updatedAt = new Date().toISOString();
  } else {
    state.dayRecords.push(createDayRecord(date, status));
  }

  state.absenceFormExpanded = false;
  saveDayRecords();
  showToast(status === "WORKDAY" ? "Arbeitstag gespeichert." : "Kein Arbeitstag gespeichert.");
  renderAll();
}

function setCommuteStatus(status) {
  if (!["UNSET", "YES", "NO"].includes(status)) return;
  const date = toIsoDate(state.selectedDate);
  const record = findDayRecordForDate(date);
  if (!record || record.workdayStatus !== "WORKDAY") return;

  record.primaryWorkplaceVisited = status === "YES" ? true : status === "NO" ? false : null;
  record.updatedAt = new Date().toISOString();
  saveDayRecords();
  showToast(status === "YES" ? "Fahrtag gespeichert." : status === "NO" ? "Ohne Fahrt gespeichert." : "Fahrtangabe entfernt.");
  renderAll();
}

function createDayRecord(date, workdayStatus) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `day-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date,
    year: Number(date.slice(0, 4)),
    workdayStatus,
    primaryWorkplaceVisited: null,
    createdAt: now,
    updatedAt: now,
  };
}

function toggleSelectedEntry() {
  const date = toIsoDate(state.selectedDate);
  const existing = findEntryForDate(date);
  const formData = currentFormData(date);

  if (existing) {
    if (entryDiffers(existing, formData)) {
      Object.assign(existing, {
        ...formData,
        allowanceAmount: calculateAllowance(formData),
        updatedAt: new Date().toISOString(),
      });
      saveEntries();
      showToast("Änderung gespeichert.");
      renderAll();
      return;
    }

    state.entries = state.entries.filter((entry) => entry.id !== existing.id);
    saveEntries();
    showToast("Markierung entfernt.");
    renderAll();
    return;
  }

  const entry = createEntry(formData);

  state.entries.push(entry);
  saveEntries();
  showToast("Tag gespeichert.");
  renderAll();
}

function createEntry(input) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: input.date,
    year: Number(input.date.slice(0, 4)),
    category: input.category,
    regionType: input.regionType,
    country: input.country || "",
    location: input.location || "",
    allowanceAmount: calculateAllowance(input),
    allowanceCurrency: "EUR",
    note: input.note || "",
    tripId: input.tripId || "",
    createdAt: now,
    updatedAt: now,
  };
}

function currentFormData(date) {
  return {
    date,
    year: Number(date.slice(0, 4)),
    category: state.selectedCategory,
    regionType: state.selectedRegion,
    country: state.selectedRegion === "FOREIGN" ? state.selectedCountry : "Deutschland",
    location: state.selectedRegion === "FOREIGN" ? els.locationInput.value.trim() : "",
    note: els.noteInput.value.trim(),
  };
}

function updateHomeAction() {
  const date = toIsoDate(state.selectedDate);
  const existing = findEntryForDate(date);
  const formData = currentFormData(date);
  const allowance = calculateAllowance(formData);

  if (existing && entryDiffers(existing, formData)) {
    els.toggleEntry.textContent = `Änderung speichern${state.settings.showAmounts ? ` · ${allowance} €` : ""}`;
    els.toggleEntry.classList.remove("remove");
    return;
  }

  els.toggleEntry.textContent = existing
    ? "Markierung entfernen"
    : `${CATEGORY_LABELS[state.selectedCategory]} markieren${state.settings.showAmounts ? ` · ${allowance} €` : ""}`;
  els.toggleEntry.classList.toggle("remove", Boolean(existing));
}

function entryDiffers(entry, formData) {
  return ["category", "regionType", "country", "location", "note"].some((key) => (entry[key] || "") !== (formData[key] || ""));
}

function loadFormFromSelectedDate() {
  const existing = findEntryForDate(toIsoDate(state.selectedDate));
  if (existing) {
    loadFormFromEntry(existing);
  } else {
    els.locationInput.value = "";
    els.noteInput.value = "";
  }
}

function loadFormFromEntry(entry) {
  state.selectedCategory = entry.category;
  state.selectedRegion = entry.regionType;
  state.selectedCountry = entry.country && entry.country !== "Deutschland" ? entry.country : state.selectedCountry;
  els.locationInput.value = entry.location || "";
  els.noteInput.value = entry.note || "";
}

function editEntry(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) return;
  state.selectedDate = parseIsoDate(entry.date);
  state.absenceFormExpanded = true;
  loadFormFromEntry(entry);
  switchView("home");
  renderAll();
}

function editDayRecord(id) {
  const record = state.dayRecords.find((item) => item.id === id);
  if (!record) return;
  state.selectedDate = parseIsoDate(record.date);
  state.absenceFormExpanded = false;
  loadFormFromSelectedDate();
  switchView("home");
  renderAll();
}

function openTripDialog() {
  const iso = toIsoDate(state.selectedDate);
  els.tripStart.value = iso;
  els.tripEnd.value = iso;
  els.tripTitle.value = "";
  els.tripNote.value = "";
  els.tripLocation.value = "";
  els.tripCountry.value = state.selectedCountry;
  state.tripRegion = state.selectedRegion;
  renderTripDialogRegion();
  els.tripDialog.showModal();
}

function createTripEntries() {
  const start = parseIsoDate(els.tripStart.value);
  const end = parseIsoDate(els.tripEnd.value);
  if (end < start) {
    showToast("Enddatum liegt vor dem Startdatum.");
    return;
  }

  const tripId = crypto.randomUUID ? crypto.randomUUID() : `trip-${Date.now()}`;
  const days = daysBetween(start, end);
  const noteParts = [els.tripTitle.value.trim(), els.tripNote.value.trim()].filter(Boolean);
  const note = noteParts.join(" · ");
  const newEntries = days.map((date, index) => {
    let category = "FULL_24H";
    if (days.length === 1) category = "OVER_8H";
    else if (index === 0) category = "ARRIVAL_DAY";
    else if (index === days.length - 1) category = "DEPARTURE_DAY";

    return createEntry({
      date: toIsoDate(date),
      category,
      regionType: state.tripRegion,
      country: state.tripRegion === "FOREIGN" ? els.tripCountry.value : "Deutschland",
      location: state.tripRegion === "FOREIGN" ? els.tripLocation.value.trim() : "",
      note,
      tripId,
    });
  });

  const newDates = new Set(newEntries.map((entry) => entry.date));
  state.entries = state.entries.filter((entry) => !newDates.has(entry.date)).concat(newEntries);
  state.overviewYear = start.getFullYear();
  state.overviewMode = "ABSENCE";
  state.selectedFilter = "ALL";
  saveEntries();
  els.tripDialog.close();
  switchView("overview");
  showToast(`${newEntries.length} Tage erzeugt.`);
  renderAll();
}

function toggleSelectionMode() {
  if (state.selectionMode && state.selectedIds.size > 0) {
    const typeLabel = state.overviewMode === "WORK" ? "Tagesangaben" : "Auswärtseinträge";
    els.confirmText.textContent = `${state.selectedIds.size} ausgewählte ${typeLabel} aus ${state.overviewYear} wirklich löschen?`;
    els.confirmDialog.showModal();
    return;
  }

  state.selectionMode = !state.selectionMode;
  state.selectedIds.clear();
  renderOverview();
}

function deleteSelectedEntries() {
  const ids = new Set(state.selectedIds);
  if (state.overviewMode === "WORK") {
    state.dayRecords = state.dayRecords.filter((record) => !ids.has(record.id));
    saveDayRecords();
  } else {
    state.entries = state.entries.filter((entry) => !ids.has(entry.id));
    saveEntries();
  }
  state.selectedIds.clear();
  state.selectionMode = false;
  showToast(`${ids.size} Einträge gelöscht.`);
  renderAll();
}

function updateSelectionButton() {
  if (!state.selectionMode) {
    els.selectionMode.textContent = "Auswahl";
    return;
  }
  els.selectionMode.textContent = state.selectedIds.size ? `${state.selectedIds.size} löschen` : "Abbrechen";
}

function changeYear(delta) {
  state.overviewYear += delta;
  state.selectedFilter = "ALL";
  state.selectedWorkFilter = "WORKDAY";
  state.selectionMode = false;
  state.selectedIds.clear();
  renderOverview();
}

function updateSettings() {
  state.settings.showAmounts = els.showAmounts.checked;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  showToast("Einstellungen gespeichert.");
  renderAll();
}

function exportCurrentYearCsv() {
  const csv = buildYearCsv(state.overviewYear);
  if (!csv) {
    showToast("Keine Einträge für dieses Jahr.");
    return;
  }

  downloadFile(`aussenzeit_${state.overviewYear}.csv`, csv, "text/csv;charset=utf-8");
}

function buildYearCsv(year) {
  const entries = getEntriesForYear(year);
  const dayRecords = getDayRecordsForYear(year);
  const dates = [...new Set([...entries.map((entry) => entry.date), ...dayRecords.map((record) => record.date)])].sort();

  if (!dates.length) return "";

  const header = [
    "Datum",
    "Wochentag",
    "Jahr",
    "Arbeitstag",
    "Erste Tätigkeitsstätte aufgesucht",
    "Auswärtskategorie",
    "Inland/Ausland",
    "Land",
    "Ort",
    "Pauschbetrag EUR",
    "Notiz",
  ];
  const rows = dates.map((date) => {
    const entry = entries.find((item) => item.date === date);
    const dayRecord = dayRecords.find((item) => item.date === date);
    const workday = dayRecord
      ? dayRecord.workdayStatus === "WORKDAY" ? "Ja" : "Nein"
      : "Nicht erfasst";
    const workplaceVisited = !dayRecord || dayRecord.workdayStatus !== "WORKDAY"
      ? "Nicht anwendbar"
      : dayRecord.primaryWorkplaceVisited === true
        ? "Ja"
        : dayRecord.primaryWorkplaceVisited === false
          ? "Nein"
          : "Offen";

    return [
      date,
      formatWeekdayLong(parseIsoDate(date)),
      year,
      workday,
      workplaceVisited,
      entry ? CATEGORY_LABELS[entry.category] : "",
      entry ? entry.regionType === "DOMESTIC" ? "Inland" : "Ausland" : "",
      entry?.country || "",
      entry?.location || "",
      entry ? entry.allowanceAmount || 0 : "",
      entry?.note || "",
    ];
  });

  return toCsv([header, ...rows]);
}

function exportBackup() {
  const payload = {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    entries: state.entries,
    dayRecords: state.dayRecords,
    settings: state.settings,
  };
  downloadFile("aussenzeit_backup.json", JSON.stringify(payload, null, 2), "application/json");
}

function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(String(reader.result));
      if (!Array.isArray(payload.entries)) throw new Error("Invalid backup");
      state.entries = payload.entries;
      state.dayRecords = normalizeDayRecords(payload.dayRecords);
      state.settings = { ...state.settings, ...(payload.settings || {}) };
      saveEntries();
      saveDayRecords();
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
      showToast("Backup importiert.");
      renderAll();
    } catch {
      showToast("Backup konnte nicht gelesen werden.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const file = new File([blob], filename, { type });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: filename }).catch(() => {
      downloadBlob(filename, blob);
    });
    return;
  }

  downloadBlob(filename, blob);
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function calculateAllowance(entry) {
  if (entry.regionType === "DOMESTIC") return DOMESTIC_ALLOWANCES[entry.category] || 0;
  const rate = FOREIGN_ALLOWANCES[entry.country] || FOREIGN_ALLOWANCES.Luxemburg;
  return entry.category === "FULL_24H" ? rate.full : rate.short;
}

function getEntriesForYear(year) {
  return state.entries
    .filter((entry) => entry.year === year)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getDayRecordsForYear(year) {
  return state.dayRecords
    .filter((record) => record.year === year)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function filterEntries(entries) {
  if (state.selectedFilter === "ALL") return entries;
  return entries.filter((entry) => entry.regionType === state.selectedFilter || entry.category === state.selectedFilter);
}

function filterDayRecords(records) {
  switch (state.selectedWorkFilter) {
    case "WORKDAY":
      return records.filter((record) => record.workdayStatus === "WORKDAY");
    case "COMMUTE":
      return records.filter((record) => record.workdayStatus === "WORKDAY" && record.primaryWorkplaceVisited === true);
    case "COMMUTE_OPEN":
      return records.filter((record) => record.workdayStatus === "WORKDAY" && record.primaryWorkplaceVisited == null);
    case "NON_WORKDAY":
      return records.filter((record) => record.workdayStatus === "NON_WORKDAY");
    default:
      return records;
  }
}

function countDayRecordsForFilter(records, filter) {
  switch (filter) {
    case "WORKDAY":
      return records.filter((record) => record.workdayStatus === "WORKDAY").length;
    case "COMMUTE":
      return records.filter((record) => record.workdayStatus === "WORKDAY" && record.primaryWorkplaceVisited === true).length;
    case "COMMUTE_OPEN":
      return records.filter((record) => record.workdayStatus === "WORKDAY" && record.primaryWorkplaceVisited == null).length;
    case "NON_WORKDAY":
      return records.filter((record) => record.workdayStatus === "NON_WORKDAY").length;
    default:
      return records.length;
  }
}

function findEntryForDate(date) {
  return state.entries.find((entry) => entry.date === date);
}

function findDayRecordForDate(date) {
  return state.dayRecords.find((record) => record.date === date);
}

function countWorkdays(records) {
  return new Set(records.filter((record) => record.workdayStatus === "WORKDAY").map((record) => record.date)).size;
}

function countCommuteDays(records) {
  return new Set(
    records
      .filter((record) => record.workdayStatus === "WORKDAY" && record.primaryWorkplaceVisited === true)
      .map((record) => record.date),
  ).size;
}

function summarize(entries) {
  return entries.reduce((acc, entry) => {
    acc[entry.category] = (acc[entry.category] || 0) + 1;
    return acc;
  }, {});
}

function sumAllowances(entries) {
  return entries.reduce((sum, entry) => sum + Number(entry.allowanceAmount || 0), 0);
}

function regionLabel(entry) {
  if (entry.regionType === "DOMESTIC") return "Inland";
  return ["Ausland", entry.country, entry.location].filter(Boolean).join(" · ");
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
}

function saveDayRecords() {
  localStorage.setItem(DAY_RECORDS_KEY, JSON.stringify(state.dayRecords));
}

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeDayRecords(records) {
  if (!Array.isArray(records)) return [];
  const byDate = new Map();

  records.forEach((record) => {
    if (!record || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) return;
    if (!["WORKDAY", "NON_WORKDAY"].includes(record.workdayStatus)) return;
    const workday = record.workdayStatus === "WORKDAY";
    const primaryWorkplaceVisited = workday && typeof record.primaryWorkplaceVisited === "boolean"
      ? record.primaryWorkplaceVisited
      : null;
    const now = new Date().toISOString();

    byDate.set(record.date, {
      ...record,
      id: record.id || `day-${record.date}`,
      year: Number(record.date.slice(0, 4)),
      primaryWorkplaceVisited,
      createdAt: record.createdAt || now,
      updatedAt: record.updatedAt || now,
    });
  });

  return [...byDate.values()];
}

function scrollSelectedIntoView() {
  const selected = els.dateWheel.querySelector(".date-option.selected");
  if (selected) selected.scrollIntoView({ inline: "center", block: "nearest" });
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetween(start, end) {
  const days = [];
  for (let cursor = startOfDay(start); cursor <= end; cursor = addDays(cursor, 1)) {
    days.push(new Date(cursor));
  }
  return days;
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateLong(date) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateNumeric(date) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatWeekdayShort(date) {
  return new Intl.DateTimeFormat("de-DE", { weekday: "short" }).format(date);
}

function formatWeekdayLong(date) {
  return new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(date);
}

function formatMonthShort(date) {
  return new Intl.DateTimeFormat("de-DE", { month: "short" }).format(date);
}

function toCsv(rows) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function handleBeforeInstallPrompt(event) {
  event.preventDefault();

  if (isSamsungInternet()) {
    showSamsungInstallNotice();
    return;
  }

  state.deferredInstallPrompt = event;
  els.installApp.hidden = false;
}

async function installApp() {
  if (isSamsungInternet()) {
    openInChrome();
    return;
  }

  if (!state.deferredInstallPrompt) {
    showToast("Installation ist in diesem Browser gerade nicht verfügbar.");
    return;
  }

  state.deferredInstallPrompt.prompt();
  await state.deferredInstallPrompt.userChoice.catch(() => null);
  state.deferredInstallPrompt = null;
  els.installApp.hidden = true;
}

function handleAppInstalled() {
  state.deferredInstallPrompt = null;
  els.installApp.hidden = true;
  showToast("Diensttag wurde installiert.");
}

function configureInstallExperience() {
  if (!isSamsungInternet() || isStandalone()) return;

  els.installApp.hidden = true;
  if (!state.samsungInstallNoticeDismissed) showSamsungInstallNotice();
}

function showSamsungInstallNotice() {
  if (state.samsungInstallNoticeDismissed) return;

  const secureHint = window.isSecureContext
    ? "Öffne diese Seite in Chrome und installiere sie dort ohne diese Warnung."
    : "Öffne die App über eine HTTPS-Adresse in Chrome; erst dann ist eine echte PWA-Installation möglich.";

  els.samsungInstallText.textContent =
    `Samsung Internet erzeugt derzeit ein App-Paket, das Play Protect als veraltet meldet. ${secureHint}`;
  els.samsungInstallNotice.hidden = false;
}

function openInChrome() {
  if (!/^https?:$/.test(location.protocol)) {
    showToast("Diese Seite kann nicht direkt an Chrome übergeben werden.");
    return;
  }

  const scheme = location.protocol.slice(0, -1);
  const target = `${location.host}${location.pathname}${location.search}${location.hash}`;
  const fallback = encodeURIComponent(location.href);
  location.href = `intent://${target}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
}

function isSamsungInternet() {
  return /SamsungBrowser/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    const hadController = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController || refreshing) return;
      refreshing = true;
      location.reload();
    });

    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).catch(() => {});
  }
}
