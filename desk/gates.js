(function (root) {
  const REQUIRED_EVIDENCE = [
    "form_6_6",
    "proforma_invoice",
    "purchase_order",
    "goods_list_hs_codes",
    "conformity_documents",
  ];

  function isRecord(value) {
    return value != null && typeof value === "object" && !Array.isArray(value);
  }

  function intakeReview(job) {
    const issues = [];
    if (!job.destination) issues.push("Destination is missing");
    if (!job.case_id) issues.push("Case ID is missing");
    if (!isRecord(job.evidence)) issues.push("Evidence checklist is missing");
    if (!isRecord(job.commercial)) issues.push("Commercial summary is missing");
    return { status: issues.length ? "Evidence requested" : "Compliance review", issues };
  }

  function vocReview(job) {
    const issues = [];
    const evidence = isRecord(job.evidence) ? job.evidence : {};
    const missing = REQUIRED_EVIDENCE.filter((name) => evidence[name] !== true);
    if (missing.length) issues.push("Missing evidence: " + missing.join(", "));
    const remote = isRecord(job.remote_inspection) ? job.remote_inspection : {};
    if (remote.requested) {
      for (const name of [
        "consent_on_file",
        "site_contact_on_file",
        "connectivity_confirmed",
        "eligibility_confirmed",
      ]) {
        if (remote[name] !== true) {
          issues.push("Remote inspection prerequisite not confirmed: " + name);
        }
      }
      if (evidence.signed_remote_consent !== true) {
        issues.push("Missing evidence: signed_remote_consent");
      }
    }
    if (job.bv_reference == null || job.bv_reference === "" || job.bv_reference === "PENDING") {
      issues.push("Bureau Veritas reference is not recorded");
    }
    if (evidence.certificate_or_ncr !== true) {
      issues.push("Certificate or Non-Conformity Report is not recorded");
    }
    if (job.dispatch_requested && issues.length) {
      issues.push("Dispatch is requested while the VOC gate is blocked");
    }
    return { status: issues.length ? "Compliance hold" : "Compliance cleared", issues };
  }

  function remoteReview(job) {
    const remote = isRecord(job.remote_inspection) ? job.remote_inspection : {};
    if (!remote.requested) return { status: "Not requested", issues: [] };
    const issues = [
      "consent_on_file",
      "site_contact_on_file",
      "connectivity_confirmed",
      "eligibility_confirmed",
    ]
      .filter((name) => remote[name] !== true)
      .map((name) => "Remote inspection prerequisite not confirmed: " + name);
    return { status: issues.length ? "Compliance hold" : "Inspection scheduled", issues };
  }

  function dispatchReview(job) {
    const issues = [];
    if (job.status !== "Compliance cleared") issues.push("VOC compliance is not cleared");
    for (const name of [
      "carrier_confirmed",
      "git_confirmed",
      "tracking_confirmed",
      "border_documents_confirmed",
    ]) {
      if (job[name] !== true) issues.push("Operational prerequisite not confirmed: " + name);
    }
    return { status: issues.length ? "Dispatch hold" : "Dispatch ready", issues };
  }

  function financeReview(job) {
    const issues = [];
    const commercial = isRecord(job.commercial) ? job.commercial : {};
    const keys = ["declared_total", "freight", "insurance_value", "incoterm"];
    if (keys.some((key) => commercial[key] == null || commercial[key] === "")) {
      issues.push(job.case_id + ": financial data gap in commercial values");
    }
    const statusText = !Object.prototype.hasOwnProperty.call(job, "status")
      ? "missing"
      : job.status == null
        ? "None"
        : String(job.status);
    if (job.status !== "Compliance cleared" && job.status !== "Closed") {
      issues.push(job.case_id + ": compliance status is " + statusText);
    }
    return { status: "Job audit", issues };
  }

  function assess(job) {
    const intake = intakeReview(job);
    const compliance = vocReview(job);
    const remote = remoteReview(job);
    const dispatch = dispatchReview(job);
    const finance = financeReview(job);
    let lane = "clear";
    if (intake.issues.length) lane = "intake";
    else if (compliance.issues.length) lane = "compliance";
    else if (isRecord(job.remote_inspection) && job.remote_inspection.requested && remote.issues.length) {
      lane = "inspection";
    } else if (dispatch.issues.length) lane = "dispatch";
    else if (finance.issues.length) lane = "finance";
    return { lane, intake, compliance, remote, dispatch, finance };
  }

  root.NamayaniGates = {
    REQUIRED_EVIDENCE,
    intakeReview,
    vocReview,
    remoteReview,
    dispatchReview,
    financeReview,
    assess,
  };
})(globalThis);
