#!/usr/bin/env python3
"""Generate RTO / LL to DL Pipeline Ops Guide PDF (with flow diagrams)."""

from pathlib import Path

from fpdf import FPDF

OUT = Path(__file__).with_name("RTO_LL_Pipeline_Ops_Guide.pdf")


class GuidePDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 100, 100)
        self.cell(0, 6, "inlane | RTO LL to DL Pipeline Ops Guide", align="L")
        self.ln(8)

    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, f"Page {self.page_no()}/{{nb}}", align="C")

    def _reset_x(self):
        self.set_x(self.l_margin)

    def h1(self, text):
        self.ln(2)
        self._reset_x()
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(20, 20, 20)
        self.multi_cell(self.epw, 8, text)
        self.ln(1)

    def h2(self, text):
        self.ln(3)
        self._reset_x()
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(30, 60, 120)
        self.multi_cell(self.epw, 6.5, text)
        self.ln(1)

    def body(self, text):
        self._reset_x()
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 30, 30)
        self.multi_cell(self.epw, 5.2, text)
        self.ln(1)

    def bullet(self, text):
        self._reset_x()
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 30, 30)
        self.set_x(self.l_margin + 3)
        self.multi_cell(self.epw - 3, 5.2, "- " + text)

    def note(self, text):
        self._reset_x()
        self.set_fill_color(245, 247, 250)
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(50, 50, 50)
        self.multi_cell(self.epw, 5, "Note: " + text, fill=True)
        self.ln(2)

    def step(self, n, text):
        self._reset_x()
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 30, 30)
        self.multi_cell(self.epw, 5.2, f"{n}. {text}")

    def legend(self):
        self._reset_x()
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(40, 40, 40)
        self.cell(20, 5, "Legend:")
        items = [
            ((30, 100, 60), "Happy path"),
            ((180, 70, 50), "Failure / problem"),
            ((40, 90, 160), "Admin action"),
            ((120, 90, 40), "Branch choice"),
        ]
        x = self.get_x() + 2
        y = self.get_y()
        for color, label in items:
            self.set_fill_color(*color)
            self.rect(x, y + 1, 4, 3, style="F")
            self.set_xy(x + 5, y)
            self.set_font("Helvetica", "", 8)
            self.set_text_color(50, 50, 50)
            self.cell(self.get_string_width(label) + 6, 5, label)
            x = self.get_x() + 2
        self.ln(7)

    def _ensure_space(self, needed):
        if self.get_y() + needed > self.page_break_trigger:
            self.add_page()

    def flow_box(self, x, y, w, h, text, fill=(230, 238, 250), border=(30, 60, 120)):
        self.set_fill_color(*fill)
        self.set_draw_color(*border)
        self.set_line_width(0.3)
        self.rect(x, y, w, h, style="DF")
        self.set_xy(x + 1, y + 1.2)
        self.set_font("Helvetica", "B", 7.5)
        self.set_text_color(20, 20, 20)
        self.multi_cell(w - 2, 3.2, text, align="C")

    def arrow_down(self, x, y, length=6):
        self.set_draw_color(80, 80, 80)
        self.set_line_width(0.4)
        self.line(x, y, x, y + length - 1.5)
        # chevron
        self.line(x, y + length - 1.5, x - 1.5, y + length - 3.5)
        self.line(x, y + length - 1.5, x + 1.5, y + length - 3.5)

    def arrow_right(self, x, y, length=8):
        self.set_draw_color(80, 80, 80)
        self.set_line_width(0.4)
        self.line(x, y, x + length - 1.5, y)
        self.line(x + length - 1.5, y, x + length - 3.5, y - 1.5)
        self.line(x + length - 1.5, y, x + length - 3.5, y + 1.5)

    def vertical_flow(self, title, nodes, start_y=None):
        """nodes: list of (label, kind) kind in happy|fail|action|branch|end"""
        colors = {
            "happy": ((230, 242, 234), (30, 100, 60)),
            "fail": ((252, 232, 228), (180, 70, 50)),
            "action": ((230, 238, 250), (40, 90, 160)),
            "branch": ((255, 244, 220), (160, 110, 30)),
            "end": ((235, 235, 235), (80, 80, 80)),
        }
        self._ensure_space(18 + len(nodes) * 16)
        if title:
            self.h2(title)
        y = start_y if start_y is not None else self.get_y()
        box_w = 95
        box_h = 10
        x = self.l_margin + (self.epw - box_w) / 2
        for i, (label, kind) in enumerate(nodes):
            fill, border = colors.get(kind, colors["happy"])
            self.flow_box(x, y, box_w, box_h, label, fill, border)
            if i < len(nodes) - 1:
                self.arrow_down(x + box_w / 2, y + box_h, 5.5)
                y = y + box_h + 5.5
            else:
                y = y + box_h + 3
        self.set_y(y + 2)

    def horizontal_phases(self, phases):
        """Overview strip of major phases."""
        self._ensure_space(36)
        n = len(phases)
        gap = 4
        arrow = 7
        usable = self.epw - (n - 1) * (gap + arrow)
        box_w = usable / n
        box_h = 16
        y = self.get_y()
        x = self.l_margin
        for i, label in enumerate(phases):
            self.flow_box(
                x,
                y,
                box_w,
                box_h,
                label,
                fill=(230, 238, 250),
                border=(30, 60, 120),
            )
            if i < n - 1:
                self.arrow_right(x + box_w + 0.5, y + box_h / 2, arrow)
                x += box_w + gap + arrow
            else:
                x += box_w
        self.set_y(y + box_h + 6)

    def branch_flow(self):
        """Post-LL fork diagram."""
        self._ensure_space(70)
        self.h2("Flow diagram - Post-LL branch (pick ONE)")
        y = self.get_y()
        box_w, box_h = 52, 11
        cx = self.l_margin + self.epw / 2
        # top
        self.flow_box(cx - box_w / 2, y, box_w, box_h, "LL Issued", (230, 242, 234), (30, 100, 60))
        # split lines
        self.set_draw_color(80, 80, 80)
        self.set_line_width(0.4)
        mid_y = y + box_h
        fork_y = mid_y + 8
        self.line(cx, mid_y, cx, fork_y)
        left_x = self.l_margin + 18 + box_w / 2
        right_x = self.l_margin + self.epw - 18 - box_w / 2
        self.line(left_x, fork_y, right_x, fork_y)
        self.line(left_x, fork_y, left_x, fork_y + 4)
        self.line(right_x, fork_y, right_x, fork_y + 4)

        left_nodes = [
            "OB Form Enabled\n(with Classes)",
            "Classes In Progress",
            "DL Date Options",
        ]
        right_nodes = [
            "LL Maturing\n(1-month timer)",
            "LL Matured",
            "DL Date Options",
        ]
        ly = fork_y + 4
        ry = fork_y + 4
        for i, label in enumerate(left_nodes):
            self.flow_box(
                left_x - box_w / 2,
                ly,
                box_w,
                box_h + (2 if i == 0 else 0),
                label,
                (255, 244, 220) if i == 0 else (230, 242, 234),
                (160, 110, 30) if i == 0 else (30, 100, 60),
            )
            h = box_h + (2 if i == 0 else 0)
            if i < len(left_nodes) - 1:
                self.arrow_down(left_x, ly + h, 5)
                ly += h + 5
            else:
                ly += h
        for i, label in enumerate(right_nodes):
            self.flow_box(
                right_x - box_w / 2,
                ry,
                box_w,
                box_h + (2 if i == 0 else 0),
                label,
                (255, 244, 220) if i == 0 else (230, 242, 234),
                (160, 110, 30) if i == 0 else (30, 100, 60),
            )
            h = box_h + (2 if i == 0 else 0)
            if i < len(right_nodes) - 1:
                self.arrow_down(right_x, ry + h, 5)
                ry += h + 5
            else:
                ry += h

        join_y = max(ly, ry) + 6
        self.line(left_x, ly, left_x, join_y)
        self.line(right_x, ry, right_x, join_y)
        self.line(left_x, join_y, right_x, join_y)
        self.line(cx, join_y, cx, join_y + 4)
        self.flow_box(
            cx - box_w / 2,
            join_y + 4,
            box_w,
            box_h,
            "Continue to DL Test",
            (230, 238, 250),
            (40, 90, 160),
        )
        self.set_y(join_y + 4 + box_h + 6)
        self.note(
            "Left = customer bought classes. Right = direct DL after LL matures. "
            "Clicking the branch button also sets ll_type."
        )

    def admin_howto_flow(self):
        self._ensure_space(95)
        self.h2("Flow diagram - How an admin uses the screen")
        nodes = [
            ("Open /admin/ll-pipeline", "action"),
            ("Pick queue tab or search learner", "action"),
            ("Select application (right panel opens)", "action"),
            ("Review docs / enter RTO details / Save", "action"),
            ("Move forward OR mark failure OR Revert", "branch"),
            ("Check Timeline (who / when / why)", "action"),
            ("Customer homepage + WhatsApp update\n(forward moves only; Revert = no WA)", "end"),
        ]
        self.vertical_flow(None, nodes)

    def revert_flow(self):
        self._ensure_space(90)
        self.h2("Flow diagram - Stage Revert (fix a mistake)")
        nodes = [
            ("Realise stage was promoted too far", "fail"),
            ("Click Revert stage", "action"),
            ("Pick earlier valid stage + required reason", "action"),
            ("Confirm revert", "action"),
            ("Status moves back; later fields cleared", "happy"),
            ("Timeline logs Reverted (actor + time + reason)\nNo WhatsApp sent", "end"),
        ]
        self.vertical_flow(None, nodes)

    def table(self, headers, rows, col_widths):
        self._reset_x()
        line_h = 4.2

        def row_height(values, font_style=""):
            self.set_font("Helvetica", font_style, 8.5 if font_style != "B" else 9)
            h = line_h
            for i, val in enumerate(values):
                w = col_widths[i] - 2
                words = str(val).split()
                lines = 1
                cur = 0
                for word in words:
                    ww = self.get_string_width(word + " ")
                    if cur + ww > w:
                        lines += 1
                        cur = ww
                    else:
                        cur += ww
                h = max(h, lines * line_h + 2)
            return h

        def draw_header():
            self._reset_x()
            self.set_font("Helvetica", "B", 9)
            self.set_fill_color(30, 60, 120)
            self.set_text_color(255, 255, 255)
            hh = row_height(headers, "B")
            x = self.l_margin
            y = self.get_y()
            for i, h in enumerate(headers):
                self.set_xy(x, y)
                self.multi_cell(col_widths[i], line_h, h, border=1, fill=True)
                x += col_widths[i]
            self.set_y(y + hh)

        draw_header()
        fill = False
        for row in rows:
            rh = row_height(row)
            if self.get_y() + rh > self.page_break_trigger:
                self.add_page()
                draw_header()
            self.set_font("Helvetica", "", 8.5)
            self.set_text_color(30, 30, 30)
            self.set_fill_color(248, 248, 248) if fill else self.set_fill_color(255, 255, 255)
            x = self.l_margin
            y = self.get_y()
            for i, cell in enumerate(row):
                self.set_xy(x, y)
                self.rect(x, y, col_widths[i], rh, style="DF" if fill else "D")
                self.multi_cell(col_widths[i], line_h, str(cell))
                x += col_widths[i]
            self.set_y(y + rh)
            fill = not fill
        self.ln(3)


def build():
    pdf = GuidePDF(orientation="P", unit="mm", format="A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.set_margins(14, 14, 14)
    pdf.add_page()

    # Cover
    pdf.ln(32)
    pdf.set_font("Helvetica", "B", 24)
    pdf.set_text_color(20, 40, 90)
    pdf.multi_cell(pdf.epw, 11, "RTO / LL to DL Pipeline", align="C")
    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(60, 60, 60)
    pdf.multi_cell(pdf.epw, 8, "Ops User Guide, Flow Diagrams & Migration", align="C")
    pdf.ln(8)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(80, 80, 80)
    pdf.multi_cell(
        pdf.epw,
        6,
        "Visual flows plus step-by-step instructions so RTO admins know "
        "exactly how to run, correct, and migrate applications on "
        "/admin/ll-pipeline.",
        align="C",
    )
    pdf.ln(12)
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(pdf.epw, 6, "Product: inlane web app", align="C")
    pdf.multi_cell(pdf.epw, 6, "Admin route: /admin/ll-pipeline", align="C")
    pdf.multi_cell(pdf.epw, 6, "Audience: RTO Ops / Admin agents", align="C")

    # ===== FLOW DIAGRAMS SECTION (early, for admins who skim) =====
    pdf.add_page()
    pdf.h1("1. Flow diagrams (read this first)")
    pdf.body(
        "These diagrams show the full RTO journey and how an admin should use "
        "the pipeline screen day to day. Details for each button and field "
        "follow in later sections."
    )
    pdf.legend()

    pdf.h2("A. Big picture - six phases")
    pdf.horizontal_phases(
        [
            "1. Docs &\nPayment",
            "2. Application\nCall",
            "3. RTO\nSubmission",
            "4. LL Test",
            "5. Post-LL\nbranch",
            "6. DL Test &\nDelivery",
        ]
    )
    pdf.body(
        "Work left to right. Use queue tabs on the admin page that match these "
        "phases. Escalations tab = failures + manually escalated cases."
    )

    pdf.h2("B. Happy path - Docs through RTO submission")
    pdf.vertical_flow(
        None,
        [
            ("Payment Received  (New Application starts here)", "happy"),
            ("Document Upload Link Sent", "happy"),
            ("Documents Submitted", "happy"),
            ("Documents Under Review  [approve each doc]", "action"),
            ("Meet Booking Enabled", "happy"),
            ("Appointment Booked  [complete Meet call]", "action"),
            ("RTO Application Generated  [tick Services]", "action"),
            ("Govt Payment Pending", "happy"),
            ("Ready for Scrutiny  [enter App No. + Date + Route A/B/C/D]", "action"),
            ("Route branches here — see segregation routes", "branch"),
            ("A/D: Scrutiny queue -> Runner -> Submitted", "happy"),
            ("B: LL Test Enabled (or optional scrutiny)", "happy"),
            ("C: LL Approval Pending (skip scrutiny + LL test)", "happy"),
            ("D after verification: LL Approval (no LL test)", "happy"),
            ("Waiting / LL Test / Approval -> LL Issued", "happy"),
        ],
    )

    pdf.add_page()
    pdf.h2("C. Happy path - LL Test to journey complete")
    pdf.vertical_flow(
        None,
        [
            ("LL Test Enabled  [enter Scrutiny Approved Date]", "action"),
            ("LL Test Passed", "happy"),
            ("LL Approval Pending", "happy"),
            ("LL Issued  [enter LL No. + dates; upload LL card]", "action"),
            ("Post-LL branch  (Classes OR Maturing) - see next diagram", "branch"),
            ("DL Date Options Enabled", "happy"),
            ("DL Date Preference Received  [customer picked slot]", "happy"),
            ("DL Test Confirmed  [enter RTO, time, address]", "action"),
            ("Results Pending -> DL Test Passed", "happy"),
            ("DL Number Generated  [enter DL No.; upload DL card]", "action"),
            ("Delivery Pending  [ETA + tracking]", "action"),
            ("DL Delivered  (journey complete)", "end"),
        ],
    )

    pdf.branch_flow()

    pdf.add_page()
    pdf.admin_howto_flow()
    pdf.revert_flow()

    pdf.h2("D. Common failure exits (red buttons)")
    pdf.table(
        ["If this happens", "Click / status", "Then recover to"],
        [
            ["Docs incomplete", "Docs Rejected", "Documents Submitted"],
            ["Customer no-show on Meet", "Missed by Customer", "Appointment Booked"],
            ["Lane / tech miss", "Missed by Lane", "Appointment Booked"],
            ["Govt fee failed", "Payment Failed", "Govt Payment Pending"],
            ["RTO scrutiny reject", "Scrutiny Not Approved", "Submitted at RTO"],
            ["LL test fail", "LL Test Failed", "LL Test Enabled"],
            ["Scrutiny older than 7 days", "Scrutiny Expired (auto)", "Meet Booking Enabled"],
            ["LL approval reject", "LL Approval Rejected", "Meet Booking Enabled"],
            ["DL no-show / fail", "Missed / Failed", "DL Test Confirmed"],
        ],
        [58, 55, 67],
    )

    # ===== HOW TO USE =====
    pdf.add_page()
    pdf.h1("2. What this tool is")
    pdf.body(
        "The LL to DL Pipeline is the admin board where RTO agents track every "
        "customer from payment through Learner Licence (LL), optional classes "
        "or LL maturing, DL test booking, and DL card delivery."
    )
    pdf.body(
        "Open it from Admin Home -> \"LL to DL Pipeline\", or go directly to "
        "/admin/ll-pipeline. Permission required: ll_pipeline."
    )
    pdf.note(
        "Customer WhatsApp messages fire automatically on many forward stage "
        "moves. Stage Revert never sends WhatsApp."
    )

    pdf.h2("Screen layout")
    pdf.bullet("Top tabs = phases + Escalations.")
    pdf.bullet("Left list = applications (search by name / phone / application no. / LL no.).")
    pdf.bullet("Right panel = Move status, Documents, Licence uploads, RTO details, Timeline.")
    pdf.bullet("Date filters (Created / Updated) help during migration catch-up.")

    pdf.h1("3. Start an application (New Application)")
    pdf.step(1, "Click New Application.")
    pdf.step(2, "Search learner by name / phone / email (min 3 characters).")
    pdf.step(3, "Tick services sold (LL, Classes, DL, renewals, address change, etc.).")
    pdf.step(4, "Create. Application starts at Payment Received.")
    pdf.note(
        "Only one active journey per learner is allowed. If create fails with "
        "\"already has an active LL application\", finish or close the old one first."
    )

    pdf.h1("4. Stage-by-stage ops actions")
    pdf.body(
        "Advance with the green buttons under \"Move this application\". "
        "Add an optional note before clicking so the Timeline records context."
    )

    pdf.h2("Phase A - Docs and Payment")
    pdf.table(
        ["Stage", "Ops action"],
        [
            ["Payment Received", "Confirm payment is in; advance to Document Upload Link Sent."],
            ["Document Upload Link Sent", "Customer uploads docs in-app. Escalate if idle about 2 days."],
            ["Documents Submitted", "Move to Under Review when form + docs are in."],
            ["Documents Under Review", "Approve each doc, then advance to Meet Booking Enabled. Or mark Docs Rejected."],
        ],
        [55, 125],
    )

    pdf.h2("Phase B - Application Call")
    pdf.table(
        ["Stage", "Ops action"],
        [
            ["Meet Booking Enabled", "Customer books Meet slot; reminders at 24h/48h."],
            ["Appointment Booked", "Complete the call. Then RTO Application Generated."],
            ["RTO Application Generated", "Tick Services; move to Govt Payment Pending."],
        ],
        [55, 125],
    )
    pdf.note(
        "If the customer misses the Meet twice, call_missed_count reaches 2 and "
        "the customer experience switches to \"Ops will call you\"."
    )

    pdf.h2("Phase C - RTO Submission")
    pdf.table(
        ["Stage", "Ops action / fields"],
        [
            ["Govt Payment Pending", "Track govt fee. Payment Failed recovers here."],
            ["Ready for RTO", "Enter Application Number, Application Date, Segregation route (A/B/C/D). Route picks next stages."],
            ["Route A / D", "In Scrutiny → Runner → Submitted → Waiting. A then LL test; D then Approval (no LL test)."],
            ["Route B", "Prefer LL Test Enabled (fast track). Optional scrutiny path if needed."],
            ["Route C", "Jump to LL Approval Pending (no scrutiny, no LL test)."],
            ["Waiting for RTO Verification", "A/B → LL Test Enabled. D → LL Approval Pending."],
        ],
        [55, 125],
    )

    pdf.h2("Segregation routes (batch_code A–D)")
    pdf.body(
        "At Ready for RTO, pick the lane. The Move buttons then follow that route:"
    )
    pdf.bullet("A Out of state: Scrutiny → Runner → Submitted → Waiting → LL test → Approval.")
    pdf.bullet("B Aadhaar fast track: Prefer LL Test Enabled; optional scrutiny if needed.")
    pdf.bullet("C Add-on name matched: Jump to LL Approval Pending (no scrutiny, no LL test).")
    pdf.bullet("D Add-on name mismatch: Scrutiny path, then Approval (skip LL test).")
    pdf.table(
        ["Route", "Who / naming schema", "Key steps"],
        [
            [
                "A — Out of state",
                "No Aadhaar auth, No 2WL DL. Out-of-state Aadhaar; rental/affidavit.",
                "Docs yes; physical verification yes; scrutiny yes; LL test yes",
            ],
            [
                "B — Aadhaar fast track",
                "Yes Aadhaar auth, No 2WL DL. KA-Bengaluru Aadhaar; recent photo.",
                "Docs none; physical no; scrutiny normally none; LL test yes",
            ],
            [
                "C — Add-on, name matched",
                "Yes Aadhaar auth, Yes 2WL DL. Adding 4W; DL name = Aadhaar name.",
                "Docs none; physical no; scrutiny none; LL test no",
            ],
            [
                "D — Add-on, name mismatch",
                "No Aadhaar auth, Yes 2WL DL. Adding 4W; DL name ≠ Aadhaar name.",
                "Manual DL upload; physical no; scrutiny yes; LL test no",
            ],
        ],
        [40, 75, 65],
    )

    pdf.h2("Phase D - LL Test")
    pdf.table(
        ["Stage", "Ops action / fields"],
        [
            ["LL Test Enabled", "Enter Scrutiny Approved Date (expiry auto = +7 days)."],
            ["LL Test Passed", "Advance to LL Approval Pending."],
            ["LL Approval Pending", "If rejected, recovers to Meet Booking Enabled."],
            ["LL Issued", "Enter LL Number, Issue Date, Valid Till. Upload LL card. Then choose branch."],
        ],
        [55, 125],
    )

    pdf.h2("Phase E / F - Post-LL and DL")
    pdf.bullet("With Classes: OB Form -> Classes In Progress -> DL Date Options.")
    pdf.bullet("Direct DL: LL Maturing (set LL Matures On) -> LL Matured -> DL Date Options.")
    pdf.bullet("Then: Preference Received -> (optional OTP) -> DL Test Confirmed -> Results -> DL Number -> Delivery -> Delivered.")
    pdf.bullet("On DL Test Confirmed, fill RTO address so the customer Get Directions button works.")

    pdf.add_page()
    pdf.h1("5. Admin functions (every control)")

    pdf.h2("5.1 Move this application")
    pdf.bullet("Forward buttons = happy path next stage(s).")
    pdf.bullet("Red outline buttons = failure outcomes.")
    pdf.bullet("Resume (on a failure stage) = returns to the documented recover stage.")
    pdf.bullet("Escalate / Clear escalation = Escalations tab flag.")
    pdf.bullet("Optional note = saved on Timeline.")

    pdf.h2("5.2 Revert stage")
    pdf.body(
        "Use when promoted too far by mistake. Click Revert stage, pick earlier "
        "valid stage, enter required reason, Confirm."
    )
    pdf.bullet("Only earlier stages allowed by the state machine are listed.")
    pdf.bullet("No customer WhatsApp. Timeline shows Reverted with actor + time + reason.")
    pdf.bullet("Later-stage fields clear automatically; documents/form answers are kept.")

    pdf.h2("5.3 Documents, uploads, RTO details, Timeline")
    pdf.bullet("Documents: approve/reject each upload; overall approve via Move status.")
    pdf.bullet("Issued LL/DL uploads: power customer Download buttons.")
    pdf.bullet("RTO details: edit fields + Services, then Save details (logged).")
    pdf.bullet("Timeline: append-only audit of status_change, status_reversal, field_update, notes.")

    pdf.h1("6. Migration playbook")
    pdf.body(
        "Moving paper / spreadsheet / old LL customers onto the new pipeline "
        "without inventing future stages."
    )
    pdf.step(1, "New Application; select correct Services.")
    pdf.step(2, "Advance to the true current stage; note \"Migrated from sheet...\" on Timeline.")
    pdf.step(3, "Save details for that stage (app no., LL no., etc.).")
    pdf.step(4, "Upload LL/DL cards if you have files.")
    pdf.step(5, "If you overshoot: Revert with reason \"migration correction\".")
    pdf.step(6, "Completed journeys -> DL Delivered so the learner is no longer active.")

    pdf.h2("Where to land common cases")
    pdf.table(
        ["Customer reality", "Target stage"],
        [
            ["Paid, no docs yet", "Payment Received / Doc Link Sent"],
            ["Docs under RTO review", "Documents Under Review"],
            ["Meet done / app drafted", "RTO Application Generated / Govt Payment"],
            ["At RTO with app number", "Ready for Scrutiny or Submitted"],
            ["Waiting LL test", "LL Test Enabled"],
            ["LL issued + classes", "OB Form / Classes In Progress"],
            ["LL issued + maturing", "LL Maturing"],
            ["DL booked / done / delivered", "DL Test Confirmed / Delivery / Delivered"],
        ],
        [70, 110],
    )

    pdf.h1("7. Daily checklist")
    pdf.step(1, "Escalations tab - clear or progress stuck failures.")
    pdf.step(2, "Docs Under Review - approve/reject documents.")
    pdf.step(3, "RTO Submission - enter numbers/dates, advance runners.")
    pdf.step(4, "LL Test - scrutiny dates, LL numbers, card uploads.")
    pdf.step(5, "DL Test - confirm slots, RTO address, tracking.")
    pdf.step(6, "Wrong promotion? Revert stage + reason immediately.")

    pdf.ln(6)
    pdf._reset_x()
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(90, 90, 90)
    pdf.multi_cell(
        pdf.epw,
        5,
        "Source of truth: src/constants/llPipeline.ts, "
        "src/routes/admin/LLPipeline.tsx, src/queries/llApplications.ts.",
    )

    pdf.output(OUT)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build()
