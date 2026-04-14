from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
import io

def generate_pdf_report(audit_id: str, fix_id: str, 
                        summary_json: dict, metrics: dict, 
                        before_score: float, after_score: float) -> bytes:
    """
    Building a PDF report with ReportLab.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    # Title
    elements.append(Paragraph("<b>Explainable AI Auditor Compliance Report</b>", styles['Title']))
    elements.append(Spacer(1, 12))

    # Executive Summary
    elements.append(Paragraph("<b>Executive Summary</b>", styles['Heading2']))
    elements.append(Paragraph(summary_json.get('summary', 'No summary available.'), styles['Normal']))
    elements.append(Spacer(1, 12))

    # Audit Scores
    elements.append(Paragraph("<b>Audit Scores</b>", styles['Heading2']))
    data = [
        ["Phase", "Score", "Verdict"],
        ["Initial Audit", f"{before_score}", "Needs Mitigation" if before_score > 30 else "Passed"],
        ["Post-Fix Audit", f"{after_score}", "Passed" if after_score <= 30 else "Requires Further Tuning"]
    ]
    t = Table(data)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 12))

    # EU AI Act Mapping
    elements.append(Paragraph("<b>Regulatory Alignment</b>", styles['Heading2']))
    elements.append(Paragraph(f"<b>Article 10 (Data Governance):</b> {summary_json.get('article_10', 'N/A')}", styles['Normal']))
    elements.append(Paragraph(f"<b>Article 12 (Record Keeping):</b> {summary_json.get('article_12', 'N/A')}", styles['Normal']))
    elements.append(Paragraph(f"<b>Article 14 (Human Oversight):</b> {summary_json.get('article_14', 'N/A')}", styles['Normal']))
    elements.append(Spacer(1, 12))

    # Metrics Details
    elements.append(Paragraph("<b>Fairness Metrics</b>", styles['Heading2']))
    metric_data = [["Metric", "Value"]]
    for k, v in metrics.items():
        metric_data.append([k.replace('_', ' ').title(), f"{v}"])
    
    t_metrics = Table(metric_data)
    t_metrics.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
    ]))
    elements.append(t_metrics)

    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
