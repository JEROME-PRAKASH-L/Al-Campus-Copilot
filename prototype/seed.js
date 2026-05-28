// Seed data — represents what 5 ingested notices would look like after the
// RAG pipeline has parsed/chunked/embedded them and the extractor has pulled
// out deadlines + career cards. Used by the prototype only.

window.SEED = {
  documents: [
    { id: "d1", title: "Spring 2026 Midterm Schedule",          kind: "exam",    status: "ready",      created_at: "2026-02-12T10:14:00Z" },
    { id: "d2", title: "Acme Robotics — Summer Internship 2026", kind: "career",  status: "ready",      created_at: "2026-02-18T08:02:00Z" },
    { id: "d3", title: "TechFest Aurora 2026 — Event Schedule",  kind: "event",   status: "ready",      created_at: "2026-02-20T16:30:00Z" },
    { id: "d4", title: "Merit Scholarship — Application Window", kind: "notice",  status: "ready",      created_at: "2026-02-22T11:11:00Z" },
    { id: "d5", title: "Holi Holiday Notice (Admin)",            kind: "holiday", status: "processing", created_at: "2026-02-26T09:48:00Z" },
  ],

  deadlines: [
    { id: "x1", title: "Database Systems midterm",        date: "2026-03-09", kind: "exam",    doc: "Spring 2026 Midterm Schedule" },
    { id: "x2", title: "Operating Systems midterm",       date: "2026-03-11", kind: "exam",    doc: "Spring 2026 Midterm Schedule" },
    { id: "x3", title: "Linear Algebra midterm",          date: "2026-03-13", kind: "exam",    doc: "Spring 2026 Midterm Schedule" },
    { id: "x4", title: "Acme Robotics application close", date: "2026-03-18", kind: "apply",   doc: "Acme Robotics — Summer Internship 2026" },
    { id: "x5", title: "Holi holiday",                    date: "2026-03-25", kind: "holiday", doc: "Holi Holiday Notice (Admin)" },
    { id: "x6", title: "TechFest Aurora opening keynote", date: "2026-04-02", kind: "event",   doc: "TechFest Aurora 2026 — Event Schedule" },
    { id: "x7", title: "TechFest Aurora hackathon final", date: "2026-04-04", kind: "event",   doc: "TechFest Aurora 2026 — Event Schedule" },
    { id: "x8", title: "Merit Scholarship deadline",      date: "2026-04-15", kind: "apply",   doc: "Merit Scholarship — Application Window" },
  ],

  careers: [
    {
      id: "c1",
      company: "Acme Robotics",
      role: "Summer Software Intern",
      eligibility: "CGPA ≥ 7.0 · CSE, ECE, ME · 3rd year",
      ctc: "₹85,000 / month stipend",
      apply_by: "2026-03-18",
      location: "Bengaluru, IN",
      mode: "hybrid",
      doc: "Acme Robotics — Summer Internship 2026",
    },
    {
      id: "c2",
      company: "Northwind Analytics",
      role: "Data Engineering Intern",
      eligibility: "CGPA ≥ 7.5 · Any branch · 3rd / 4th year",
      ctc: "₹60,000 / month + housing",
      apply_by: "2026-03-22",
      location: "Remote (IN)",
      mode: "remote",
      doc: "Northwind Spring 2026 Hiring",
    },
    {
      id: "c3",
      company: "Helio Labs",
      role: "ML Research Apprentice",
      eligibility: "CGPA ≥ 8.0 · CSE / Math · prior project required",
      ctc: "₹1,20,000 / month",
      apply_by: "2026-04-05",
      location: "Hyderabad, IN",
      mode: "onsite",
      doc: "Helio Labs Apprenticeship Program",
    },
  ],

  // Tiny "context" excerpts used by the prototype's mini-RAG.
  // Real app pulls these from pgvector; here we keyword-match for the demo.
  chunks: [
    { doc: "Spring 2026 Midterm Schedule",
      text: "Midterm examinations for the Spring 2026 semester will be held during the week of March 9–13. Database Systems (CS-301) is scheduled for Monday, March 9, 10:00–12:00 in Hall A. Operating Systems (CS-305) is on Wednesday, March 11, 14:00–16:00 in Hall B. Linear Algebra (MA-201) is on Friday, March 13, 10:00–12:00 in Hall C. Students must carry a valid ID card. No electronic devices are permitted." },
    { doc: "Acme Robotics — Summer Internship 2026",
      text: "Acme Robotics is hiring Summer Software Interns for 2026. Role: backend systems for autonomous fleet control. Stipend: ₹85,000/month. Eligibility: third-year students from CSE, ECE, or ME with CGPA ≥ 7.0. Mode: hybrid (Bengaluru office, two days remote). Application window closes March 18, 2026 at 23:59 IST. Shortlisted candidates will be notified by March 22." },
    { doc: "TechFest Aurora 2026 — Event Schedule",
      text: "TechFest Aurora 2026 runs April 2–4 on the main quad. The opening keynote begins on April 2 at 10:00 in the Central Auditorium. The 36-hour hackathon final happens April 3–4 with judging on April 4 at 18:00. Student teams of up to four may register through the campus portal." },
    { doc: "Merit Scholarship — Application Window",
      text: "The Chancellor's Merit Scholarship is open to second- and third-year students with CGPA ≥ 8.5. Applications must include transcripts, two faculty recommendations, and a one-page statement. The application deadline is April 15, 2026. Awardees receive ₹50,000 toward tuition for the following semester." },
    { doc: "Holi Holiday Notice (Admin)",
      text: "The administration confirms Wednesday, March 25, 2026 as a holiday on account of Holi. Classes will not be held. Hostel mess services will run on the holiday schedule. The library will remain open from 10:00 to 17:00." },
  ],
};
