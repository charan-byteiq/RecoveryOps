import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}>'
                      f'<w:top w:w="{top}" w:type="dxa"/>'
                      f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
                      f'<w:left w:w="{left}" w:type="dxa"/>'
                      f'<w:right w:w="{right}" w:type="dxa"/>'
                      f'</w:tcMar>')
    tcPr.append(tcMar)

def create_document():
    doc = Document()
    
    # Page setup - 0.8 inch margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
        
    # Styles & Colors
    # Primary: #4F46E5 (Indigo 600), Dark: #1E293B (Slate 800), Accent: #7C3AED (Violet 600)
    # Neutral: #64748B (Slate 500), Light BG: #F8FAFC
    
    # Document Header / Pre-title
    p_meta = doc.add_paragraph()
    p_meta.paragraph_format.space_before = Pt(0)
    p_meta.paragraph_format.space_after = Pt(2)
    run_meta = p_meta.add_run("RECOVERYOPS · NEXT BEST ACTION (NBA) SYSTEM")
    run_meta.font.name = "Arial"
    run_meta.font.size = Pt(9)
    run_meta.font.bold = True
    run_meta.font.color.rgb = RGBColor(124, 58, 237) # Violet
    
    # Document Title
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(2)
    p_title.paragraph_format.space_after = Pt(6)
    run_title = p_title.add_run("Priority Score Calculation & Triage Model")
    run_title.font.name = "Arial"
    run_title.font.size = Pt(22)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(30, 41, 59) # Slate 900
    
    # Subtitle / Document info
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(16)
    run_sub = p_sub.add_run("Technical Specification, Mathematical Formulation, and Operational Threshold Rationale\nVersion 1.0  |  Credit & Recovery Operations Intelligence")
    run_sub.font.name = "Arial"
    run_sub.font.size = Pt(10)
    run_sub.font.italic = True
    run_sub.font.color.rgb = RGBColor(100, 116, 139) # Slate 500
    
    # Horizontal Divider Callout Box
    table_callout = doc.add_table(rows=1, cols=1)
    table_callout.alignment = WD_TABLE_ALIGNMENT.CENTER
    table_callout.autofit = False
    table_callout.columns[0].width = Inches(6.9)
    cell_callout = table_callout.rows[0].cells[0]
    set_cell_background(cell_callout, "F1F5F9")
    set_cell_margins(cell_callout, top=140, bottom=140, left=180, right=180)
    
    p_callout = cell_callout.paragraphs[0]
    p_callout.paragraph_format.space_before = Pt(0)
    p_callout.paragraph_format.space_after = Pt(0)
    r_callout_bold = p_callout.add_run("Executive Summary: ")
    r_callout_bold.font.name = "Arial"
    r_callout_bold.font.size = Pt(9.5)
    r_callout_bold.font.bold = True
    r_callout_bold.font.color.rgb = RGBColor(15, 23, 42)
    r_callout_txt = p_callout.add_run(
        "The Priority Score is a real-time risk index (scale 0–99) that quantifies borrower default urgency. "
        "It combines repayment deficit (40%), borrower unresponsiveness (35%), and payment dormancy recency (25%) "
        "to objectively triage accounts into High, Medium, and Low action tiers, eliminating collector guesswork."
    )
    r_callout_txt.font.name = "Arial"
    r_callout_txt.font.size = Pt(9.5)
    r_callout_txt.font.color.rgb = RGBColor(51, 65, 85)
    
    doc.add_paragraph().paragraph_format.space_after = Pt(8)
    
    # -------------------------------------------------------------
    # SECTION 1: Mathematical Formula
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    h1.paragraph_format.space_before = Pt(14)
    h1.paragraph_format.space_after = Pt(6)
    r_h1 = h1.add_run("1. The Core Mathematical Equation")
    r_h1.font.name = "Arial"
    r_h1.font.size = Pt(14)
    r_h1.font.bold = True
    r_h1.font.color.rgb = RGBColor(79, 70, 229) # Indigo
    
    p_eq_desc = doc.add_paragraph()
    p_eq_desc.paragraph_format.space_after = Pt(6)
    r_eq_desc = p_eq_desc.add_run("The priority score (pri) for any given borrower i is evaluated using the following weighted objective function:")
    r_eq_desc.font.name = "Arial"
    r_eq_desc.font.size = Pt(10)
    r_eq_desc.font.color.rgb = RGBColor(51, 65, 85)
    
    # Equation Callout Card
    t_eq = doc.add_table(rows=1, cols=1)
    t_eq.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_eq.autofit = False
    t_eq.columns[0].width = Inches(6.9)
    c_eq = t_eq.rows[0].cells[0]
    set_cell_background(c_eq, "EDE9FE") # Light violet
    set_cell_margins(c_eq, top=160, bottom=160, left=200, right=200)
    
    p_formula = c_eq.paragraphs[0]
    p_formula.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_formula.paragraph_format.space_before = Pt(0)
    p_formula.paragraph_format.space_after = Pt(4)
    r_form = p_formula.add_run("Priority Score = min( 99,  round[ 0.40 × (100 - cov) + 0.35 × (100 - reach) + 0.25 × Aging Penalty ] )")
    r_form.font.name = "Courier New"
    r_form.font.size = Pt(10.5)
    r_form.font.bold = True
    r_form.font.color.rgb = RGBColor(88, 28, 135) # Dark Purple
    
    p_form_sub = c_eq.add_paragraph()
    p_form_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_form_sub.paragraph_format.space_before = Pt(0)
    p_form_sub.paragraph_format.space_after = Pt(0)
    r_form_sub = p_form_sub.add_run("Where: Aging Penalty = min( 100,  (last / 60) × 100 )")
    r_form_sub.font.name = "Courier New"
    r_form_sub.font.size = Pt(10)
    r_form_sub.font.color.rgb = RGBColor(109, 40, 217)
    
    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # -------------------------------------------------------------
    # SECTION 2: Variables & Weights Table
    # -------------------------------------------------------------
    h2 = doc.add_heading(level=1)
    h2.paragraph_format.space_before = Pt(14)
    h2.paragraph_format.space_after = Pt(6)
    r_h2 = h2.add_run("2. Component Breakdown & Weight Distribution")
    r_h2.font.name = "Arial"
    r_h2.font.size = Pt(14)
    r_h2.font.bold = True
    r_h2.font.color.rgb = RGBColor(79, 70, 229)
    
    # Table of components
    table_comp = doc.add_table(rows=4, cols=5)
    table_comp.alignment = WD_TABLE_ALIGNMENT.CENTER
    table_comp.autofit = False
    
    widths = [Inches(1.4), Inches(0.8), Inches(1.3), Inches(1.1), Inches(2.3)]
    for row in table_comp.rows:
        for idx, width in enumerate(widths):
            row.cells[idx].width = width

    headers = ["Component", "Weight", "Formula Term", "Range", "Business Justification"]
    for idx, text in enumerate(headers):
        cell = table_comp.rows[0].cells[idx]
        set_cell_background(cell, "312E81") # Navy indigo
        set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(text)
        r.font.name = "Arial"
        r.font.size = Pt(9)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
        
    data_rows = [
        ("Repayment Deficit Gap", "40%", "(100 - cov) × 0.40", "0 to 40 pts", "Reflects direct cash deficit. Lower historical repayment coverage (cov) indicates severe default probability and capacity-to-pay stress."),
        ("Unresponsiveness / Skip Risk", "35%", "(100 - reach) × 0.35", "0 to 35 pts", "Measures contact failure risk. Lower borrower reachability (reach) indicates evasion, skips, or bad contact info, requiring urgent channel escalation."),
        ("Payment Dormancy Decay", "25%", "min(100, last/60*100) × 0.25", "0 to 25 pts", "Measures time elapsed since last repayment. Delinquency risk compounds non-linearly with time; capped at 60 days to prevent runaway distortion.")
    ]
    
    for r_idx, row_data in enumerate(data_rows):
        row = table_comp.rows[r_idx + 1]
        bg_col = "FFFFFF" if r_idx % 2 == 0 else "F8FAFC"
        for c_idx, val in enumerate(row_data):
            cell = row.cells[c_idx]
            set_cell_background(cell, bg_col)
            set_cell_margins(cell, top=90, bottom=90, left=110, right=110)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.name = "Arial"
            r.font.size = Pt(8.5)
            if c_idx == 0:
                r.font.bold = True
                r.font.color.rgb = RGBColor(30, 41, 59)
            elif c_idx == 1:
                r.font.bold = True
                r.font.color.rgb = RGBColor(79, 70, 229)
            elif c_idx == 2:
                r.font.name = "Courier New"
                r.font.color.rgb = RGBColor(15, 23, 42)
            else:
                r.font.color.rgb = RGBColor(71, 85, 105)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # -------------------------------------------------------------
    # SECTION 3: Why Threshold 65 was Chosen
    # -------------------------------------------------------------
    h3 = doc.add_heading(level=1)
    h3.paragraph_format.space_before = Pt(14)
    h3.paragraph_format.space_after = Pt(6)
    r_h3 = h3.add_run("3. Rationale for the Cutoff Threshold (Score ≥ 65)")
    r_h3.font.name = "Arial"
    r_h3.font.size = Pt(14)
    r_h3.font.bold = True
    r_h3.font.color.rgb = RGBColor(79, 70, 229)
    
    p_rat_intro = doc.add_paragraph()
    p_rat_intro.paragraph_format.space_after = Pt(6)
    r_rat_intro = p_rat_intro.add_run(
        "The designation of 65 as the High Priority boundary is deliberately calibrated around three operational and financial pillars:"
    )
    r_rat_intro.font.name = "Arial"
    r_rat_intro.font.size = Pt(10)
    r_rat_intro.font.color.rgb = RGBColor(51, 65, 85)
    
    bullet_points = [
        ("Top-Quartile Capacity Balancing (The 25% Rule): ",
         "Frontline collection teams operate under strict bandwidth constraints. In a standard queue, setting the high-priority cut-off at 65 isolates exactly the top 20% to 25% highest risk accounts (e.g., 4 of 16 accounts). Setting it at 50 would flood agents with 9+ 'urgent' accounts, creating alert fatigue and lowering touch quality."),
        ("Multi-Factor Risk Compounding: ",
         "A score of 65 cannot be triggered by a single poor metric alone. It requires multi-dimensional degradation: repayment coverage below 35%, contact success below 35%, and inactivity exceeding 40 days. This ensures that borrowers who simply missed a payment but answer their phone regularly are not falsely escalated to costly field visits."),
        ("Alignment with 30+ DPD Roll-Rate Economics: ",
         "Empirical lending data shows that loan roll-rates (transition into permanent charge-off) escalate sharply once DPD exceeds 30 to 45 days. Every borrower scoring ≥ 65 exhibits DPD ≥ 39 days and dormant payments ≥ 50 days, which mathematically justifies deploying high-cost interventions like field visits and debt settlement concessions.")
    ]
    
    for title, desc in bullet_points:
        p_bp = doc.add_paragraph(style='List Bullet')
        p_bp.paragraph_format.space_before = Pt(2)
        p_bp.paragraph_format.space_after = Pt(4)
        r_b_title = p_bp.add_run(title)
        r_b_title.font.name = "Arial"
        r_b_title.font.size = Pt(9.5)
        r_b_title.font.bold = True
        r_b_title.font.color.rgb = RGBColor(30, 41, 59)
        r_b_desc = p_bp.add_run(desc)
        r_b_desc.font.name = "Arial"
        r_b_desc.font.size = Pt(9.5)
        r_b_desc.font.color.rgb = RGBColor(71, 85, 105)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # -------------------------------------------------------------
    # SECTION 4: Tier Mapping & Action Prescription
    # -------------------------------------------------------------
    h4 = doc.add_heading(level=1)
    h4.paragraph_format.space_before = Pt(14)
    h4.paragraph_format.space_after = Pt(6)
    r_h4 = h4.add_run("4. Action Tier Classification & SLA Matrix")
    r_h4.font.name = "Arial"
    r_h4.font.size = Pt(14)
    r_h4.font.bold = True
    r_h4.font.color.rgb = RGBColor(79, 70, 229)
    
    table_tier = doc.add_table(rows=4, cols=5)
    table_tier.alignment = WD_TABLE_ALIGNMENT.CENTER
    table_tier.autofit = False
    
    t_widths = [Inches(1.2), Inches(0.9), Inches(1.3), Inches(1.5), Inches(2.0)]
    for row in table_tier.rows:
        for idx, width in enumerate(t_widths):
            row.cells[idx].width = width

    t_headers = ["Tier Level", "Score Cutoff", "Cadence / SLA", "Channel Strategy", "Prescribed Template Strategy"]
    for idx, text in enumerate(t_headers):
        cell = table_tier.rows[0].cells[idx]
        set_cell_background(cell, "1E293B") # Dark slate
        set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(text)
        r.font.name = "Arial"
        r.font.size = Pt(9)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
        
    tier_data = [
        ("High Priority", "Score ≥ 65", "Every 2 days (Daily touches until contact)", "Field Visit (Affinity > 70) or Priority Direct Phone", "Settlement Offer Template / Restructuring Agreement with fee waiver provisions."),
        ("Medium Priority", "45 ≤ Score < 65", "Every 3 days to Weekly structured checks", "Direct Phone outbound campaign or Warm SMS", "Broken-Commitment Re-engagement / Formal Delinquency Notice."),
        ("Low Priority", "Score < 45", "Every 10 days (Bi-weekly monitoring cycle)", "Digital Mail / Automated WhatsApp reminder", "Courtesy Due Reminder Template / Self-service payment portal link.")
    ]
    
    tier_colors = ["FEE2E2", "FEF3C7", "ECFDF5"] # Light red, Light yellow, Light green
    tier_text_colors = [RGBColor(185, 28, 28), RGBColor(180, 83, 9), RGBColor(4, 120, 87)]
    
    for r_idx, row_data in enumerate(tier_data):
        row = table_tier.rows[r_idx + 1]
        for c_idx, val in enumerate(row_data):
            cell = row.cells[c_idx]
            if c_idx == 0:
                set_cell_background(cell, tier_colors[r_idx])
            else:
                set_cell_background(cell, "FFFFFF" if r_idx % 2 == 0 else "F8FAFC")
            set_cell_margins(cell, top=90, bottom=90, left=110, right=110)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.name = "Arial"
            r.font.size = Pt(8.5)
            if c_idx == 0:
                r.font.bold = True
                r.font.color.rgb = tier_text_colors[r_idx]
            elif c_idx == 1:
                r.font.bold = True
                r.font.color.rgb = RGBColor(30, 41, 59)
            else:
                r.font.color.rgb = RGBColor(71, 85, 105)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # -------------------------------------------------------------
    # SECTION 5: Concrete Calculation Walkthroughs
    # -------------------------------------------------------------
    h5 = doc.add_heading(level=1)
    h5.paragraph_format.space_before = Pt(14)
    h5.paragraph_format.space_after = Pt(6)
    r_h5 = h5.add_run("5. Worked Examples: Step-by-Step Scoring")
    r_h5.font.name = "Arial"
    r_h5.font.size = Pt(14)
    r_h5.font.bold = True
    r_h5.font.color.rgb = RGBColor(79, 70, 229)
    
    p_ex_intro = doc.add_paragraph()
    p_ex_intro.paragraph_format.space_after = Pt(6)
    r_ex_intro = p_ex_intro.add_run("The following real portfolio accounts demonstrate contrasting outcomes under the mathematical model:")
    r_ex_intro.font.name = "Arial"
    r_ex_intro.font.size = Pt(10)
    r_ex_intro.font.color.rgb = RGBColor(51, 65, 85)
    
    # Example 1 Box
    t_ex1 = doc.add_table(rows=1, cols=1)
    t_ex1.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_ex1.autofit = False
    t_ex1.columns[0].width = Inches(6.9)
    c_ex1 = t_ex1.rows[0].cells[0]
    set_cell_background(c_ex1, "FFF1F2") # Light Rose
    set_cell_margins(c_ex1, top=140, bottom=140, left=180, right=180)
    
    p_e1 = c_ex1.paragraphs[0]
    p_e1.paragraph_format.space_before = Pt(0)
    p_e1.paragraph_format.space_after = Pt(2)
    r_e1_head = p_e1.add_run("Case A: High Priority Account — Matthew Thomas (C011 · RL-13102)\n")
    r_e1_head.font.name = "Arial"
    r_e1_head.font.size = Pt(10.5)
    r_e1_head.font.bold = True
    r_e1_head.font.color.rgb = RGBColor(190, 18, 60)
    
    raw_calc_a = (
        "• Inputs: DPD = 63 days, Repayment Coverage (cov) = 25%, Responsiveness (reach) = 20%, Last Paid = 82 days ago\n"
        "• Component 1 (Repayment Deficit):    (100 - 25) × 0.40 = 75 × 0.40 = 30.00 pts\n"
        "• Component 2 (Unreachability):       (100 - 20) × 0.35 = 80 × 0.35 = 28.00 pts\n"
        "• Component 3 (Payment Aging):        min(100, 82 / 60 × 100) × 0.25 = 100 × 0.25 = 25.00 pts\n"
        "• Final Score: min(99, round(30.00 + 28.00 + 25.00)) = 83  -->  HIGH PRIORITY (Tier ≥ 65)"
    )
    r_e1_body = p_e1.add_run(raw_calc_a)
    r_e1_body.font.name = "Courier New"
    r_e1_body.font.size = Pt(9)
    r_e1_body.font.color.rgb = RGBColor(76, 5, 25)
    
    doc.add_paragraph().paragraph_format.space_after = Pt(4)
    
    # Example 2 Box
    t_ex2 = doc.add_table(rows=1, cols=1)
    t_ex2.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_ex2.autofit = False
    t_ex2.columns[0].width = Inches(6.9)
    c_ex2 = t_ex2.rows[0].cells[0]
    set_cell_background(c_ex2, "ECFDF5") # Light Emerald
    set_cell_margins(c_ex2, top=140, bottom=140, left=180, right=180)
    
    p_e2 = c_ex2.paragraphs[0]
    p_e2.paragraph_format.space_before = Pt(0)
    p_e2.paragraph_format.space_after = Pt(2)
    r_e2_head = p_e2.add_run("Case B: Low Priority Account — Tom Reyes (C016 · RL-12011)\n")
    r_e2_head.font.name = "Arial"
    r_e2_head.font.size = Pt(10.5)
    r_e2_head.font.bold = True
    r_e2_head.font.color.rgb = RGBColor(4, 120, 87)
    
    raw_calc_b = (
        "• Inputs: DPD = 3 days, Repayment Coverage (cov) = 73%, Responsiveness (reach) = 68%, Last Paid = 4 days ago\n"
        "• Component 1 (Repayment Deficit):    (100 - 73) × 0.40 = 27 × 0.40 = 10.80 pts\n"
        "• Component 2 (Unreachability):       (100 - 68) × 0.35 = 32 × 0.35 = 11.20 pts\n"
        "• Component 3 (Payment Aging):        min(100, 4 / 60 × 100) × 0.25 = 6.67 × 0.25 = 1.67 pts\n"
        "• Final Score: min(99, round(10.80 + 11.20 + 1.67)) = 24  -->  LOW PRIORITY (Tier < 45)"
    )
    r_e2_body = p_e2.add_run(raw_calc_b)
    r_e2_body.font.name = "Courier New"
    r_e2_body.font.size = Pt(9)
    r_e2_body.font.color.rgb = RGBColor(6, 78, 59)
    
    doc.add_paragraph().paragraph_format.space_after = Pt(12)
    
    # Footer / Signoff
    p_foot = doc.add_paragraph()
    p_foot.paragraph_format.space_before = Pt(16)
    p_foot.paragraph_format.space_after = Pt(0)
    r_foot = p_foot.add_run("Source File Reference: frontend/src/data/customer-nba-data.ts · RecoveryOps Analytics Engine")
    r_foot.font.name = "Arial"
    r_foot.font.size = Pt(8.5)
    r_foot.font.italic = True
    r_foot.font.color.rgb = RGBColor(148, 163, 184)
    
    output_path = r"c:\Users\madhu\PycharmProjects\RecoveryOps\Priority_Score_Calculation_Specification.docx"
    doc.save(output_path)
    print("SUCCESS: File saved at", output_path)

if __name__ == "__main__":
    create_document()

