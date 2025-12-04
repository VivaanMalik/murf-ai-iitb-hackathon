import arxiv
from .text_format import conversationofy

arxiv_client = arxiv.Client(page_size=10, delay_seconds=3.0, num_retries=3)

def search_arxiv_papers(query: str):
    try:
        search = arxiv.Search(
            query=query,
            max_results=1,
            sort_by=arxiv.SortCriterion.Relevance
        )
        results = list(arxiv_client.results(search))

        if not results:
            return "No papers found."

        paper = results[0]

        # Extract metadata
        authors = ", ".join(a.name for a in paper.authors)
        published = paper.published.strftime("%Y-%m-%d") if paper.published else "Unknown"
        updated = paper.updated.strftime("%Y-%m-%d") if paper.updated else "Unknown"
        categories = ", ".join(paper.categories)
        journal_ref = paper.journal_ref or "None"
        doi = paper.doi or "None"
        comments = paper.comment or "None"
        pdf_url = paper.pdf_url or "None"

        # Convert text into conversational form
        conv_title = conversationofy(paper.title)
        conv_summary = conversationofy(paper.summary)
        conv_comments = conversationofy(comments)
        conv_journal = conversationofy(journal_ref)

        response = f"""
Paper Found on arXiv
Title: {conv_title}

Summary:
{conv_summary}

Authors:
{authors}

Publication Dates:
- Published: {published}
- Last Updated: {updated}

Categories:
{categories}

Journal Reference:
{conv_journal}

Comments:
{conv_comments}

PDF Link:
{pdf_url}

arXiv ID:
{paper.entry_id}
"""
        return response.strip()

    except Exception as e:
        return f"Arxiv Error: {e}"