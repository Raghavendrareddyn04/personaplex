# SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: MIT

"""Static Qobox company knowledge base and lightweight retrieval for RAG-style prompting."""

QOBOX_COMPANY_TEXT = """
Company Name: Quality Outside The Box (Qobox)

Overview:
Quality Outside The Box (Qobox) is an Indian software quality assurance and testing services company that focuses on delivering reliable, scalable, and high-performance software systems. The company specializes in software testing, automation frameworks, performance engineering, and quality consulting services for enterprise applications.

Founded:
Qobox was established in 2020 and operates as a private limited company registered in India.

Headquarters:
The company is headquartered in Chennai, Tamil Nadu, India.

Leadership:
The company has two directors:
Gangapuram Jayanthi
Amalodbhavi Mrudula Ranjan Damavarapu

Industry:
Qobox operates in the Information Technology services industry, particularly in the software testing and quality assurance domain.

Core Services:
Qobox provides a variety of testing and quality assurance services including:

Software Testing
Manual testing for web, mobile, and enterprise applications.

Automation Testing
Developing automated test frameworks to accelerate testing cycles.

Performance Testing
Testing software under heavy load conditions to ensure system stability.

Security Testing
Identifying vulnerabilities and protecting applications from security threats.

API Testing
Validating backend APIs for reliability and performance.

QA Consulting
Helping organizations implement effective testing strategies and quality frameworks.

Industries Served:
Qobox provides services to multiple industries including:

Healthcare
Insurance
Retail
Financial services
Telecommunications
Pharmaceutical companies

Technology and Tools:
The company works with modern testing technologies and tools such as:

Test automation frameworks
Continuous Integration and Continuous Deployment (CI/CD) pipelines
Performance testing tools
Security testing tools
Enterprise testing platforms

Mission:
The mission of Qobox is to improve the reliability and quality of software systems by implementing modern testing methodologies, automation solutions, and performance engineering practices.

Vision:
The company aims to help organizations deliver high-quality software faster while reducing production issues and improving user experience.

Approach:
Qobox follows a quality-driven approach that integrates testing throughout the software development lifecycle. Their approach includes early defect detection, automated testing strategies, and continuous monitoring of application performance.

Company Culture:
Qobox promotes a culture focused on technical excellence, innovation, and continuous improvement. The company encourages its teams to adopt new testing technologies and methodologies to deliver better results for clients.

Growth and Operations:
Since its founding, Qobox has expanded its service offerings and continues to support organizations in improving their software development and release processes through professional quality assurance services.

Workforce:
The company employs professionals specializing in software testing, automation engineering, and quality consulting.

Client Focus:
Qobox works with organizations that require reliable and scalable applications and supports them in maintaining software quality across the entire development lifecycle.

Future Focus:
The company aims to expand its capabilities in test automation, AI-assisted testing, and DevOps-driven quality engineering solutions.
""".strip()


def _chunk_kb(text: str) -> list[str]:
    parts = [p.strip() for p in text.split("\n\n")]
    return [p for p in parts if p]


def _select_relevant_chunks(query: str, chunks: list[str], top_k: int = 8) -> list[str]:
    """Keyword overlap retrieval (no external embedding model)."""
    q = query.strip().lower()
    if not q:
        return chunks
    q_tokens = {w for w in q.replace(",", " ").split() if len(w) > 2}
    if not q_tokens:
        return chunks
    scored: list[tuple[int, str]] = []
    for c in chunks:
        cl = c.lower()
        score = sum(1 for t in q_tokens if t in cl)
        scored.append((score, c))
    scored.sort(key=lambda x: -x[0])
    best = [c for s, c in scored if s > 0][:top_k]
    if best:
        return best
    return chunks[: min(top_k, len(chunks))]


def merge_prompt_with_qobox_kb(
    base_prompt: str,
    *,
    use_kb: bool = True,
    rag_query: str | None = None,
) -> str:
    """
    Append Qobox KB to the persona prompt. If rag_query is set, only top-matching
    chunks are included; otherwise the full KB is used.
    """
    if not use_kb:
        return base_prompt.strip()

    chunks = _chunk_kb(QOBOX_COMPANY_TEXT)
    if rag_query and rag_query.strip():
        body = "\n\n".join(_select_relevant_chunks(rag_query, chunks))
    else:
        body = QOBOX_COMPANY_TEXT

    header = (
        "\n\nUse the following company information about Qobox when answering "
        "relevant questions (stay accurate; do not invent facts beyond this text):\n\n"
    )
    base = base_prompt.strip()
    if base:
        return f"{base}{header}{body}"
    return f"{header.strip()}\n{body}"
