(function () {
  const LANES = [
    { id: "intake", title: "Intake" },
    { id: "compliance", title: "Compliance" },
    { id: "inspection", title: "Inspection" },
    { id: "dispatch", title: "Dispatch" },
    { id: "finance", title: "Finance" },
    { id: "clear", title: "Clear" },
  ];
  const VIEWS = [
    { id: "board", label: "Board" },
    { id: "job", label: "Job" },
    { id: "map", label: "Corridor" },
    { id: "connectors", label: "Connect" },
  ];
  const EVIDENCE_LABELS = {
    form_6_6: "Form 6.6",
    proforma_invoice: "Proforma invoice",
    purchase_order: "Purchase order",
    goods_list_hs_codes: "Goods list and HS codes",
    conformity_documents: "Conformity documents",
    signed_remote_consent: "Signed remote consent",
    certificate_or_ncr: "Certificate or NCR",
  };
  const REMOTE_LABELS = {
    consent_on_file: "Consent on file",
    site_contact_on_file: "Site contact on file",
    connectivity_confirmed: "Connectivity confirmed",
    eligibility_confirmed: "Eligibility confirmed",
  };
  const DISPATCH_LABELS = {
    carrier_confirmed: "Carrier confirmed",
    git_confirmed: "GIT confirmed",
    tracking_confirmed: "Tracking confirmed",
    border_documents_confirmed: "Border documents confirmed",
  };
  const COMMERCIAL_LABELS = {
    declared_total: "Declared total",
    freight: "Freight",
    insurance_value: "Insurance value",
    incoterm: "Incoterm",
  };
  const CORRIDOR = [
    { name: "Johannesburg", lat: -26.2041, lng: 28.0473 },
    { name: "Beitbridge", lat: -22.2167, lng: 30 },
    { name: "Harare", lat: -17.8252, lng: 31.0335 },
  ];
  const PLACES = [
    { keys: ["randburg"], name: "Randburg", lat: -26.0936, lng: 27.9897 },
    { keys: ["johannesburg", "joburg"], name: "Johannesburg", lat: -26.2041, lng: 28.0473 },
    { keys: ["beitbridge"], name: "Beitbridge", lat: -22.2167, lng: 30 },
    { keys: ["kadoma"], name: "Kadoma", lat: -18.3333, lng: 29.9158 },
    { keys: ["harare"], name: "Harare", lat: -17.8252, lng: 31.0335 },
    { keys: ["zimbabwe"], name: "Harare", lat: -17.8252, lng: 31.0335 },
    { keys: ["south africa"], name: "Johannesburg", lat: -26.2041, lng: 28.0473 },
  ];
  const LOCAL_KEY = "namayani-desk-local-jobs";
  const OVERLAY_KEY = "namayani-desk-overlays";
  const BOARD_KEY = "namayani-desk-board";

  const state = {
    view: "board",
    selectedId: "",
    apiCases: [],
    jobs: [],
    env: {},
    workflows: [],
    error: "",
    loaded: false,
  };
  let map = null;
  let sortables = [];

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (key === "class") node.className = value;
      else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2).toLowerCase(), value);
      else if (value != null && value !== false) node.setAttribute(key, String(value));
    });
    (children || []).forEach((child) => {
      if (child == null || child === false) return;
      node.append(child.nodeType ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  function readStore(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeStore(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function readBoard() {
    const raw = readStore(BOARD_KEY);
    const placements = raw.placements && typeof raw.placements === "object" && !Array.isArray(raw.placements) ? raw.placements : {};
    const order = raw.order && typeof raw.order === "object" && !Array.isArray(raw.order) ? raw.order : {};
    return { placements, order };
  }

  function clearBoard(caseId) {
    const board = readBoard();
    delete board.placements[caseId];
    Object.keys(board.order).forEach((lane) => {
      if (Array.isArray(board.order[lane])) board.order[lane] = board.order[lane].filter((id) => id !== caseId);
    });
    writeStore(BOARD_KEY, board);
  }

  function matchPlace(text) {
    const value = String(text || "").toLowerCase();
    return PLACES.find((place) => place.keys.some((key) => value.includes(key))) || null;
  }

  function laneTitle(id) {
    const lane = LANES.find((entry) => entry.id === id);
    return lane ? lane.title : id;
  }

  function blankJob(id, origin, destination, cargo) {
    return {
      case_id: id,
      origin: origin || "",
      destination: destination || "",
      cargo_type: cargo || "",
      bv_reference: "PENDING",
      remote_inspection: {
        requested: false,
        consent_on_file: false,
        site_contact_on_file: false,
        connectivity_confirmed: false,
        eligibility_confirmed: false,
      },
      evidence: {
        form_6_6: false,
        proforma_invoice: false,
        purchase_order: false,
        goods_list_hs_codes: false,
        conformity_documents: false,
        signed_remote_consent: false,
        certificate_or_ncr: false,
      },
      commercial: {
        declared_total: null,
        freight: null,
        insurance_value: null,
        incoterm: null,
      },
      status: "VOC intake",
      dispatch_requested: false,
      carrier_confirmed: false,
      git_confirmed: false,
      tracking_confirmed: false,
      border_documents_confirmed: false,
    };
  }

  function mergeJobs() {
    const overlays = readStore(OVERLAY_KEY);
    const local = readStore(LOCAL_KEY);
    const jobs = state.apiCases.map((item) => {
      const overlay = overlays[item.job.case_id];
      return {
        source: overlay ? "device-edit" : "github",
        file: item.file,
        job: overlay || item.job,
      };
    });
    Object.keys(local).forEach((id) => {
      if (!jobs.some((item) => item.job.case_id === id)) {
        jobs.push({ source: "device", file: "", job: local[id] });
      }
    });
    jobs.sort((a, b) => String(a.job.case_id).localeCompare(String(b.job.case_id)));
    state.jobs = jobs;
  }

  function selected() {
    return state.jobs.find((item) => item.job.case_id === state.selectedId) || null;
  }

  function assess(job) {
    if (!window.NamayaniGates) {
      const empty = { status: "Unavailable", issues: ["Gate logic did not load"] };
      return { lane: "intake", intake: empty, compliance: empty, remote: empty, dispatch: empty, finance: empty };
    }
    return window.NamayaniGates.assess(job);
  }

  function gateStatusText(review) {
    if (review.lane === "intake") return review.intake.status;
    if (review.lane === "compliance") return review.compliance.status;
    if (review.lane === "inspection") return review.remote.status;
    if (review.lane === "dispatch") return review.dispatch.status;
    if (review.lane === "finance") return review.finance.status;
    return "Clear";
  }

  function laneInfo(job) {
    const review = assess(job);
    const board = readBoard();
    const placed = board.placements[job.case_id];
    const known = LANES.some((lane) => lane.id === placed);
    const lane = known ? placed : review.lane;
    return {
      review,
      gateLane: review.lane,
      lane,
      manual: known && placed !== review.lane,
      gateStatus: gateStatusText(review),
    };
  }

  function jobsInLane(laneId) {
    const board = readBoard();
    const order = Array.isArray(board.order[laneId]) ? board.order[laneId] : [];
    const items = state.jobs.filter((item) => laneInfo(item.job).lane === laneId);
    items.sort((a, b) => {
      const ia = order.indexOf(a.job.case_id);
      const ib = order.indexOf(b.job.case_id);
      if (ia === -1 && ib === -1) return String(a.job.case_id).localeCompare(String(b.job.case_id));
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return items;
  }

  function setHash() {
    const next = state.view === "job" || state.view === "map"
      ? "#" + state.view + (state.selectedId ? "/" + encodeURIComponent(state.selectedId) : "")
      : "#" + state.view;
    if (location.hash !== next) history.replaceState(null, "", next);
  }

  function readHash() {
    const [view, id] = location.hash.replace(/^#/, "").split("/");
    state.view = VIEWS.some((item) => item.id === view) ? view : "board";
    state.selectedId = id ? decodeURIComponent(id) : state.selectedId;
  }

  function open(view, id) {
    const changed = state.view !== view || (id && id !== state.selectedId);
    state.view = view;
    if (id) state.selectedId = id;
    setHash();
    render();
    if (changed) window.scrollTo(0, 0);
  }

  function updateJob(caseId, mutate) {
    const current = state.jobs.find((item) => item.job.case_id === caseId);
    if (!current) return;
    const next = structuredClone(current.job);
    mutate(next);
    if (current.source === "device") {
      const local = readStore(LOCAL_KEY);
      local[caseId] = next;
      writeStore(LOCAL_KEY, local);
    } else {
      const overlays = readStore(OVERLAY_KEY);
      overlays[caseId] = next;
      writeStore(OVERLAY_KEY, overlays);
    }
    mergeJobs();
    render();
  }

  function discard(caseId) {
    const current = state.jobs.find((item) => item.job.case_id === caseId);
    if (!current) return;
    if (current.source === "device") {
      const local = readStore(LOCAL_KEY);
      delete local[caseId];
      writeStore(LOCAL_KEY, local);
      state.selectedId = "";
    } else {
      const overlays = readStore(OVERLAY_KEY);
      delete overlays[caseId];
      writeStore(OVERLAY_KEY, overlays);
    }
    clearBoard(caseId);
    mergeJobs();
    render();
  }

  function download(job) {
    const blob = new Blob([JSON.stringify(job, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const safe = String(job.case_id).replace(/[^A-Za-z0-9._-]+/g, "_");
    const link = el("a", { href: url, download: safe + ".json" });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function newId() {
    const now = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return "DESK-" + now.getFullYear() + p(now.getMonth() + 1) + p(now.getDate()) + "-" + p(now.getHours()) + p(now.getMinutes()) + p(now.getSeconds());
  }

  function createJob(form) {
    const data = new FormData(form);
    const id = String(data.get("case_id") || "").trim();
    const destination = String(data.get("destination") || "").trim();
    if (!id || !destination) {
      state.error = "Case ID and destination are required.";
      render();
      return;
    }
    if (state.jobs.some((item) => item.job.case_id === id)) {
      state.error = "That case ID is already on the board.";
      render();
      return;
    }
    const job = blankJob(id, String(data.get("origin") || "").trim(), destination, String(data.get("cargo_type") || ""));
    const local = readStore(LOCAL_KEY);
    local[id] = job;
    writeStore(LOCAL_KEY, local);
    state.error = "";
    mergeJobs();
    open("job", id);
  }

  function importFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const job = JSON.parse(String(reader.result));
        if (!job || typeof job !== "object" || Array.isArray(job) || typeof job.case_id !== "string" || !job.case_id) {
          throw new Error("case_id is required");
        }
        const fromApi = state.apiCases.some((item) => item.job.case_id === job.case_id);
        if (fromApi) {
          const overlays = readStore(OVERLAY_KEY);
          overlays[job.case_id] = job;
          writeStore(OVERLAY_KEY, overlays);
        } else {
          const local = readStore(LOCAL_KEY);
          local[job.case_id] = job;
          writeStore(LOCAL_KEY, local);
        }
        state.error = "";
        mergeJobs();
        open("job", job.case_id);
      } catch {
        state.error = "That file is not a job JSON with a case_id.";
        render();
      }
    };
    reader.readAsText(file);
  }

  function importButton() {
    const file = el("input", { type: "file", accept: "application/json,.json", hidden: "hidden" });
    file.addEventListener("change", () => {
      if (file.files && file.files[0]) importFile(file.files[0]);
    });
    const button = el("button", { class: "btn btn-outline-secondary", type: "button", onclick: () => file.click() }, ["Import JSON"]);
    return el("span", { class: "d-inline-flex" }, [button, file]);
  }

  function cargoSelect() {
    return el("select", { class: "form-select", name: "cargo_type" }, [
      el("option", { value: "" }, ["Select"]),
      el("option", { value: "BESS / lithium energy storage" }, ["BESS / lithium energy storage"]),
      el("option", { value: "Solar equipment" }, ["Solar equipment"]),
      el("option", { value: "Mining equipment" }, ["Mining equipment"]),
      el("option", { value: "Industrial / general" }, ["Industrial / general"]),
    ]);
  }

  function deviceJobForm() {
    return el("form", { class: "card mb-3", onsubmit: (event) => { event.preventDefault(); createJob(event.currentTarget); } }, [
      el("div", { class: "card-header" }, [el("h2", { class: "card-title mb-0" }, ["New device job"])]),
      el("div", { class: "card-body" }, [
        el("p", { class: "text-secondary" }, ["Cities and cargo only. Leave names, phone numbers, and customer documents out of the file."]),
        el("div", { class: "row g-3" }, [
          el("div", { class: "col-md-6" }, [el("label", { class: "form-label" }, ["Case ID", el("input", { class: "form-control", name: "case_id", type: "text", value: newId(), required: "required", autocomplete: "off" })])]),
          el("div", { class: "col-md-6" }, [el("label", { class: "form-label" }, ["Cargo", cargoSelect()])]),
          el("div", { class: "col-md-6" }, [el("label", { class: "form-label" }, ["Collection / origin", el("input", { class: "form-control", name: "origin", type: "text", placeholder: "Johannesburg, South Africa" })])]),
          el("div", { class: "col-md-6" }, [el("label", { class: "form-label" }, ["Delivery / destination", el("input", { class: "form-control", name: "destination", type: "text", placeholder: "Harare, Zimbabwe", required: "required" })])]),
        ]),
        el("div", { class: "mt-3" }, [el("button", { class: "btn btn-primary", type: "submit" }, ["Add job"])]),
      ]),
    ]);
  }

  function jobCard(item) {
    const info = laneInfo(item.job);
    const route = [item.job.origin, item.job.destination].filter(Boolean).join(" → ") || "No destination";
    return el("div", { class: "kanban-item", "data-case-id": item.job.case_id }, [
      el("button", { class: "drag-handle", type: "button", "aria-label": "Drag " + item.job.case_id, title: "Drag" }, ["⋮⋮"]),
      el("button", { class: "kanban-open", type: "button", onclick: () => open("job", item.job.case_id) }, [
        el("strong", { class: "d-block" }, [item.job.case_id]),
        el("span", { class: "d-block text-secondary small" }, [route]),
        el("span", { class: "d-block small", "data-gate-status": "1" }, [info.gateStatus]),
        el("span", { class: "badge bg-yellow-lt mt-1" + (info.manual ? "" : " d-none"), "data-hand-badge": "1" }, ["Placed by hand"]),
        el("span", { class: "d-block text-secondary small" + (info.manual ? "" : " d-none"), "data-gate-lane": "1" }, ["Gate lane: " + laneTitle(info.gateLane)]),
      ]),
    ]);
  }

  function renderBoard() {
    const lanes = el("div", { class: "desk-lanes", id: "board" });
    LANES.forEach((lane) => {
      const items = jobsInLane(lane.id);
      const list = el("div", { class: "lane-list", "data-lane-list": lane.id });
      items.forEach((item) => list.append(jobCard(item)));
      lanes.append(el("section", { class: "desk-lane card", "data-lane": lane.id }, [
        el("div", { class: "card-header d-flex justify-content-between align-items-center" }, [
          el("h2", { class: "card-title mb-0" }, [lane.title]),
          el("span", { class: "badge bg-secondary-lt", "data-lane-count": "1" }, [String(items.length)]),
        ]),
        el("div", { class: "card-body" }, [
          el("p", { class: "lane-empty text-secondary mb-2" + (items.length ? " d-none" : "") }, ["No jobs"]),
          list,
        ]),
      ]));
    });
    return el("div", {}, [
      el("p", { class: "text-secondary" }, ["Quote form → intake → VOC compliance → inspection → dispatch → finance audit"]),
      !window.Sortable ? el("div", { class: "alert alert-warning", role: "status" }, ["Drag library did not load. Cards stay in their lanes."]) : null,
      el("div", { class: "d-flex flex-wrap gap-2 mb-3" }, [
        importButton(),
        el("a", { class: "btn btn-outline-secondary", href: "/" }, ["Public quote form"]),
      ]),
      lanes,
      el("div", { class: "mt-3" }, [deviceJobForm()]),
    ]);
  }

  function checkList(title, entries, read, write) {
    const box = el("div", { class: "card mb-3" }, [
      el("div", { class: "card-header" }, [el("h3", { class: "card-title mb-0" }, [title])]),
      el("div", { class: "card-body py-2" }),
    ]);
    const body = box.querySelector(".card-body");
    entries.forEach(([key, label]) => {
      const input = el("input", { class: "form-check-input", type: "checkbox" });
      input.checked = read(key) === true;
      input.addEventListener("change", () => write(key, input.checked));
      body.append(el("label", { class: "form-check desk-check" }, [input, el("span", { class: "form-check-label" }, [label])]));
    });
    return box;
  }

  function gateCard(name, result) {
    return el("section", { class: "card mb-3" }, [
      el("div", { class: "card-header" }, [
        el("h3", { class: "card-title mb-0" }, [
          name + " · ",
          el("span", { class: result.issues.length ? "text-danger" : "text-success" }, [result.status]),
        ]),
      ]),
      el("div", { class: "card-body" }, [
        result.issues.length
          ? el("ul", { class: "mb-0" }, result.issues.map((issue) => el("li", {}, [issue])))
          : el("p", { class: "text-secondary mb-0" }, ["No blocking findings"]),
      ]),
    ]);
  }

  function renderJob() {
    const item = selected();
    if (!item) {
      const list = el("div", {}, [
        el("h2", { class: "h3" }, ["Choose a job"]),
        state.jobs.length ? null : el("p", { class: "text-secondary" }, ["No jobs yet. Add one on this device."]),
      ]);
      state.jobs.forEach((job) => {
        const info = laneInfo(job.job);
        list.append(el("button", { class: "btn btn-outline-secondary w-100 mb-2 text-start", type: "button", onclick: () => open("job", job.job.case_id) }, [
          job.job.case_id + " · " + info.gateStatus,
        ]));
      });
      list.append(deviceJobForm());
      list.append(importButton());
      return list;
    }
    const review = assess(item.job);
    const info = laneInfo(item.job);
    const source = item.source === "github" ? "GitHub · " + item.file : item.source === "device-edit" ? "Edited on this device · " + item.file : "This device";
    const sheet = el("article", {}, [
      el("h2", { class: "h2 mb-1" }, [item.job.case_id]),
      el("p", { class: "text-secondary mb-1" }, [source]),
      el("p", {}, [
        (item.job.origin ? item.job.origin + " → " : "") + (item.job.destination || "No destination"),
        item.job.cargo_type ? " · " + item.job.cargo_type : "",
      ]),
      el("p", {}, [
        el("span", { class: "badge bg-secondary-lt me-1" }, ["Gate: " + info.gateStatus]),
        info.manual ? el("span", { class: "badge bg-yellow-lt" }, ["Placed by hand"]) : null,
      ]),
      gateCard("Intake", review.intake),
      gateCard("VOC compliance", review.compliance),
      gateCard("Remote inspection", review.remote),
      gateCard("Dispatch", review.dispatch),
      gateCard("Finance", review.finance),
    ]);
    sheet.append(checkList("Evidence", Object.entries(EVIDENCE_LABELS), (key) => item.job.evidence && item.job.evidence[key], (key, checked) => {
      updateJob(item.job.case_id, (job) => {
        job.evidence = job.evidence || {};
        job.evidence[key] = checked;
      });
    }));
    const remoteRequested = el("input", { class: "form-check-input", type: "checkbox" });
    remoteRequested.checked = Boolean(item.job.remote_inspection && item.job.remote_inspection.requested);
    remoteRequested.addEventListener("change", () => updateJob(item.job.case_id, (job) => {
      job.remote_inspection = job.remote_inspection || {};
      job.remote_inspection.requested = remoteRequested.checked;
    }));
    sheet.append(el("div", { class: "card mb-3" }, [
      el("div", { class: "card-header" }, [el("h3", { class: "card-title mb-0" }, ["Remote inspection"])]),
      el("div", { class: "card-body py-2" }, [
        el("label", { class: "form-check desk-check" }, [remoteRequested, el("span", { class: "form-check-label" }, ["Inspection requested"])]),
      ]),
    ]));
    sheet.append(checkList("Remote prerequisites", Object.entries(REMOTE_LABELS), (key) => item.job.remote_inspection && item.job.remote_inspection[key], (key, checked) => {
      updateJob(item.job.case_id, (job) => {
        job.remote_inspection = job.remote_inspection || {};
        job.remote_inspection[key] = checked;
      });
    }));
    const bv = el("input", { class: "form-control", type: "text", value: item.job.bv_reference || "" });
    bv.addEventListener("change", () => updateJob(item.job.case_id, (job) => { job.bv_reference = bv.value.trim(); }));
    sheet.append(el("div", { class: "mb-3" }, [
      el("label", { class: "form-label" }, ["Bureau Veritas reference", bv]),
    ]));
    const commercial = el("div", { class: "row g-3 mb-3" });
    Object.entries(COMMERCIAL_LABELS).forEach(([key, label]) => {
      const input = el("input", { class: "form-control", type: "text", value: item.job.commercial && item.job.commercial[key] != null ? item.job.commercial[key] : "" });
      input.addEventListener("change", () => updateJob(item.job.case_id, (job) => {
        job.commercial = job.commercial || {};
        job.commercial[key] = input.value.trim() || null;
      }));
      commercial.append(el("div", { class: "col-md-6" }, [el("label", { class: "form-label" }, [label, input])]));
    });
    sheet.append(el("h3", { class: "h4" }, ["Commercial"]));
    sheet.append(commercial);
    sheet.append(checkList("Dispatch checks", Object.entries(DISPATCH_LABELS), (key) => item.job[key], (key, checked) => {
      updateJob(item.job.case_id, (job) => { job[key] = checked; });
    }));
    const cleared = el("input", { class: "form-check-input", type: "checkbox" });
    cleared.checked = item.job.status === "Compliance cleared";
    cleared.addEventListener("change", () => updateJob(item.job.case_id, (job) => {
      job.status = cleared.checked ? "Compliance cleared" : "VOC intake";
    }));
    sheet.append(el("label", { class: "form-check desk-check mb-3" }, [cleared, el("span", { class: "form-check-label" }, ["Mark VOC compliance cleared"])]));
    sheet.append(el("div", { class: "d-flex flex-wrap gap-2 mb-3" }, [
      el("button", { class: "btn btn-primary", type: "button", onclick: () => download(item.job) }, ["Download JSON"]),
      importButton(),
      el("button", { class: "btn btn-outline-secondary", type: "button", onclick: () => open("map", item.job.case_id) }, ["Show on corridor"]),
      el("button", { class: "btn btn-outline-secondary", type: "button", onclick: () => discard(item.job.case_id) }, [item.source === "device" ? "Remove from this device" : "Discard device edits"]),
    ]));
    sheet.append(el("p", { class: "text-secondary" }, [
      item.source === "device"
        ? "This job exists only in this browser."
        : "Discard device edits returns the card to the gate lane. Download the JSON and commit it under ops/cases to share the job through GitHub.",
    ]));
    sheet.append(deviceJobForm());
    return sheet;
  }

  function highlightedPlaces(job) {
    if (!job) return [];
    const found = [];
    [matchPlace(job.origin), matchPlace(job.destination)].forEach((place) => {
      if (place && !found.some((item) => item.name === place.name && item.lat === place.lat)) found.push(place);
    });
    return found;
  }

  function renderMap() {
    const item = selected();
    const highlighted = item ? highlightedPlaces(item.job) : [];
    const names = new Set(highlighted.map((place) => place.name));
    const stops = CORRIDOR.map((place) => ({ ...place, on: names.has(place.name) }));
    highlighted.forEach((place) => {
      if (!stops.some((stop) => stop.name === place.name)) stops.push({ ...place, on: true, extra: true });
    });
    const summary = item
      ? item.job.case_id + " on Johannesburg → Beitbridge → Harare." + (highlighted.length ? " Highlighted: " + highlighted.map((place) => place.name).join(", ") + "." : " No known place matched on this job.")
      : "Primary corridor: Johannesburg → Beitbridge → Harare.";
    return el("div", {}, [
      el("p", { class: "text-secondary", id: "corridor-summary" }, [summary]),
      el("ul", { class: "list-inline mb-3" }, stops.map((stop) => el("li", { class: "list-inline-item me-3" }, [
        stop.name,
        stop.on ? el("span", { class: "badge bg-yellow-lt ms-1" }, ["Highlighted"]) : null,
      ]))),
      el("div", { class: "desk-map mb-2" }, [el("div", { id: "map" })]),
      el("p", { class: "text-secondary" }, ["Map data © OpenStreetMap contributors. Known places on the selected job are highlighted. Other towns stay on the corridor until the maps connector gains a geocoder."]),
    ]);
  }

  function markerStyle(on) {
    return {
      radius: on ? 12 : 7,
      color: on ? "#c9a227" : "#9aa8b8",
      weight: on ? 3 : 1,
      fillColor: on ? "#c9a227" : "#243244",
      fillOpacity: 0.95,
    };
  }

  function drawMap() {
    const box = document.getElementById("map");
    if (!box) return;
    if (window.__leafletFailed || !window.L || typeof window.L.map !== "function") {
      box.className = "desk-fallback";
      box.textContent = "Map library did not load. Corridor: Johannesburg → Beitbridge → Harare.";
      return;
    }
    try {
      map = window.L.map(box, { scrollWheelZoom: false }).setView([-22.2, 29.4], 5);
      window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      const item = selected();
      const highlighted = item ? highlightedPlaces(item.job) : [];
      const names = new Set(highlighted.map((place) => place.name));
      const line = window.L.polyline(CORRIDOR.map((place) => [place.lat, place.lng]), { color: "#c9a227", weight: 4 });
      const marks = CORRIDOR.map((place) => {
        const on = names.has(place.name);
        return window.L.circleMarker([place.lat, place.lng], markerStyle(on)).bindPopup(place.name + (on ? " · highlighted" : ""));
      });
      highlighted.forEach((place) => {
        if (!CORRIDOR.some((stop) => stop.name === place.name)) {
          marks.push(window.L.circleMarker([place.lat, place.lng], markerStyle(true)).bindPopup(place.name + " · highlighted"));
        }
      });
      const group = window.L.featureGroup([line, ...marks]).addTo(map);
      map.fitBounds(group.getBounds().pad(0.25));
      setTimeout(() => map && map.invalidateSize(), 80);
    } catch {
      if (map) {
        map.remove();
        map = null;
      }
      box.className = "desk-fallback";
      box.textContent = "Map library did not load. Corridor: Johannesburg → Beitbridge → Harare.";
    }
  }

  function statusLabel(status) {
    if (status === "needs_setup") return "Needs setup";
    if (status === "paused") return "Paused";
    return "Ready";
  }

  function statusClass(status) {
    if (status === "needs_setup") return "bg-yellow-lt";
    if (status === "paused") return "bg-secondary-lt";
    return "bg-green-lt";
  }

  function renderConnectors() {
    const connectors = (window.NamayaniDesk && window.NamayaniDesk.connectors) || [];
    const grid = el("div", { class: "row g-3" });
    connectors.forEach((connector) => {
      const result = connector.resolve({ env: state.env, cases: state.apiCases });
      const card = el("article", { class: "card h-100" }, [
        el("div", { class: "card-header d-flex justify-content-between align-items-center gap-2" }, [
          el("h2", { class: "card-title mb-0" }, [connector.name]),
          el("span", { class: "badge " + statusClass(result.status) }, [statusLabel(result.status)]),
        ]),
        el("div", { class: "card-body" }, [
          el("p", {}, [connector.purpose]),
          el("p", { class: "text-secondary" }, [result.detail]),
          el("ul", { class: "mb-2" }, connector.actions.map((action) => el("li", {}, [action]))),
          connector.fields.length
            ? el("p", { class: "text-secondary mb-0" }, ["Server fields: " + connector.fields.map((field) => field.key).join(", ")])
            : null,
        ]),
      ]);
      if (connector.id === "github" && state.workflows.length) {
        card.querySelector(".card-body").append(el("ul", { class: "mb-0 mt-2" }, state.workflows.map((workflow) => el("li", {}, [
          el("a", { href: "https://github.com/vmichello/namayani-haulage/blob/main/" + workflow.path }, [workflow.name]),
        ]))));
      }
      grid.append(el("div", { class: "col-md-6" }, [card]));
    });
    const help = el("section", { class: "card mt-3" }, [
      el("div", { class: "card-header" }, [el("h2", { class: "card-title mb-0" }, ["Add a connector"])]),
      el("div", { class: "card-body" }, [
        el("ol", { class: "mb-0" }, [
          el("li", {}, ["Copy desk/connectors/template.js and register it with NamayaniDesk.defineConnector."]),
          el("li", {}, ["Add the script tag in desk/index.html before app.js."]),
          el("li", {}, ["Read only ctx.env true/false flags. Keep tokens on the server."]),
          el("li", {}, ["Leave status paused until the live call is deliberate. Ads and Books must not spend or post by surprise."]),
        ]),
      ]),
    ]);
    return el("div", {}, [grid, help]);
  }

  function renderView() {
    if (!state.loaded) return el("p", { class: "text-secondary" }, ["Loading jobs from GitHub case files…"]);
    if (state.view === "job") return renderJob();
    if (state.view === "map") return renderMap();
    if (state.view === "connectors") return renderConnectors();
    return renderBoard();
  }

  function navLink(item, mobile) {
    const active = state.view === item.id;
    if (mobile) {
      return el("a", {
        href: "#" + item.id,
        "aria-current": active ? "page" : null,
        onclick: (event) => { event.preventDefault(); open(item.id); },
      }, [item.label]);
    }
    return el("li", { class: "nav-item" + (active ? " active" : "") }, [
      el("a", {
        class: "nav-link" + (active ? " active" : ""),
        href: "#" + item.id,
        "aria-current": active ? "page" : null,
        onclick: (event) => { event.preventDefault(); open(item.id); },
      }, [el("span", { class: "nav-link-title" }, [item.label])]),
    ]);
  }

  function destroySortables() {
    sortables.forEach((sortable) => sortable.destroy());
    sortables = [];
  }

  function refreshCards() {
    document.querySelectorAll(".kanban-item").forEach((node) => {
      const id = node.getAttribute("data-case-id");
      const item = state.jobs.find((entry) => entry.job.case_id === id);
      if (!item) return;
      const info = laneInfo(item.job);
      const hand = node.querySelector("[data-hand-badge]");
      const gate = node.querySelector("[data-gate-lane]");
      const status = node.querySelector("[data-gate-status]");
      if (hand) hand.classList.toggle("d-none", !info.manual);
      if (gate) {
        gate.textContent = "Gate lane: " + laneTitle(info.gateLane);
        gate.classList.toggle("d-none", !info.manual);
      }
      if (status) status.textContent = info.gateStatus;
    });
    document.querySelectorAll("[data-lane-list]").forEach((list) => {
      const lane = list.closest(".desk-lane");
      const count = lane ? lane.querySelector("[data-lane-count]") : null;
      const n = list.querySelectorAll(".kanban-item").length;
      if (count) count.textContent = String(n);
      const empty = list.parentElement.querySelector(".lane-empty");
      if (empty) empty.classList.toggle("d-none", n > 0);
    });
  }

  function persistBoardFromDom() {
    const board = readBoard();
    document.querySelectorAll("[data-lane-list]").forEach((list) => {
      const lane = list.getAttribute("data-lane-list");
      const ids = [...list.querySelectorAll(":scope > .kanban-item")].map((node) => node.getAttribute("data-case-id"));
      board.order[lane] = ids;
      ids.forEach((id) => { board.placements[id] = lane; });
    });
    writeStore(BOARD_KEY, board);
    refreshCards();
  }

  function bindSortables() {
    destroySortables();
    if (!window.Sortable) return;
    document.querySelectorAll("[data-lane-list]").forEach((list) => {
      sortables.push(window.Sortable.create(list, {
        group: "namayani-jobs",
        animation: 150,
        handle: ".drag-handle",
        draggable: ".kanban-item",
        ghostClass: "kanban-ghost",
        emptyInsertThreshold: 48,
        forceFallback: true,
        fallbackOnBody: true,
        onEnd: persistBoardFromDom,
      }));
    });
  }

  function teardown() {
    destroySortables();
    if (map) {
      map.remove();
      map = null;
    }
  }

  function render() {
    const y = window.scrollY;
    teardown();
    const holds = state.jobs.filter((item) => assess(item.job).lane !== "clear").length;
    const current = VIEWS.find((item) => item.id === state.view) || VIEWS[0];
    const app = document.getElementById("app");
    app.replaceChildren(el("div", { class: "page" }, [
      el("aside", { class: "navbar navbar-vertical navbar-expand-lg d-none d-lg-flex", "data-bs-theme": "dark", "aria-label": "Desk" }, [
        el("div", { class: "container-fluid" }, [
          el("h1", { class: "navbar-brand navbar-brand-autodark" }, [
            el("a", { href: "#board", onclick: (event) => { event.preventDefault(); open("board"); } }, ["Namayani ", el("span", { class: "text-gold" }, ["Desk"])]),
          ]),
          el("div", { class: "text-secondary small px-3" }, ["Haulage command"]),
          el("div", { class: "collapse navbar-collapse", id: "sidebar-menu" }, [
            el("ul", { class: "navbar-nav pt-lg-3" }, VIEWS.map((item) => navLink(item, false)).concat([
              el("li", { class: "nav-item" }, [
                el("a", { class: "nav-link", href: "/desk/shell.html" }, [
                  el("span", { class: "nav-link-title" }, ["Portable shell"]),
                ]),
              ]),
            ])),
          ]),
        ]),
      ]),
      el("div", { class: "page-wrapper" }, [
        el("header", { class: "page-header" }, [
          el("div", { class: "container-fluid" }, [
            el("div", { class: "row align-items-center g-2" }, [
              el("div", { class: "col" }, [
                el("div", { class: "d-lg-none fw-bold text-gold" }, ["Namayani Desk"]),
                el("h2", { class: "page-title mb-0" }, [current.label]),
                el("div", { class: "text-secondary" }, ["SA–Zimbabwe via Beitbridge"]),
              ]),
              el("div", { class: "col-auto d-flex flex-wrap align-items-center gap-2" }, [
                el("a", { class: "btn btn-outline-secondary", href: "/desk/shell.html" }, ["Portable shell"]),
                el("span", { class: "badge bg-secondary-lt" }, [state.jobs.length + (state.jobs.length === 1 ? " job" : " jobs")]),
                el("span", { class: holds ? "badge bg-red-lt" : "badge bg-green-lt" }, [holds ? holds + " in a gate" : "All clear"]),
              ]),
            ]),
          ]),
        ]),
        el("div", { class: "page-body" }, [
          el("div", { class: "container-fluid", id: "view" }, [
            state.error ? el("div", { class: "alert alert-danger", role: "alert" }, [state.error]) : null,
            renderView(),
          ]),
        ]),
      ]),
    ]), el("nav", { class: "desk-tabbar d-lg-none", "aria-label": "Desk" }, VIEWS.map((item) => navLink(item, true))));
    if (state.view === "map") drawMap();
    if (state.view === "board") bindSortables();
    window.scrollTo(0, y);
  }

  async function load() {
    readHash();
    try {
      const response = await fetch("/api/desk", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Desk API returned " + response.status);
      const body = await response.json();
      state.apiCases = Array.isArray(body.cases) ? body.cases : [];
      state.env = body.env || {};
      state.workflows = Array.isArray(body.workflows) ? body.workflows : [];
      state.error = "";
    } catch {
      state.apiCases = [];
      state.error = "GitHub case files are unavailable. Jobs you add on this device still stay in this browser.";
    }
    state.loaded = true;
    mergeJobs();
    if (!state.selectedId && state.jobs[0]) state.selectedId = state.jobs[0].job.case_id;
    render();
  }

  window.addEventListener("hashchange", () => {
    readHash();
    render();
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/desk/sw.js").catch(() => {});
  }

  load();
})();
