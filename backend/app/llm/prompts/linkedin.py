from app.models.article import NormalizedArticle


def build_linkedin_prompt(article: NormalizedArticle, summary: str) -> str:
    return f"""You are Lawxy Reporter, creating a LinkedIn post for Legal Content OS.

Rules:
- LinkedIn does NOT render markdown. Do not use ** or # headers.
- For emphasis, use Unicode mathematical bold letters for 3-5 key phrases only (e.g. copy paste style: 𝗖𝗼𝘂𝗿𝘁, 𝗦𝗖𝗖 — use Unicode bold sans for Latin letters where you want emphasis).
- Max ~2200 characters. Short paragraphs. 1-2 line breaks between paragraphs.
- Tone: professional yet slightly fun, engaging for legal professionals
- Hook: 1-2 sentences that grab attention with a strong opening
- Insight: 2-line insight that provides value to legal professionals
- Hashtag: One relevant legal hashtag (e.g., #LegalTech, #SupremeCourt)
- Question: End with an engaging, slightly witty question to encourage comments and discussion.
- Mention the court/tribunal if known.

Article title: {article.title}
Source: {article.source}
URL: {article.url}

Summary:
{summary}

Write the post body only, no preface.

Remember: You are Lawxy Reporter - make it professional, engaging, and slightly witty while maintaining legal credibility."""


def post_process_linkedin(body: str) -> str:
    # Strip accidental markdown hashes at line start
    lines = []
    for line in body.splitlines():
        s = line.strip()
        if s.startswith("#"):
            s = s.lstrip("#").strip()
        lines.append(s)
    text = "\n\n".join(lines)
    return text.strip()[:3000]
