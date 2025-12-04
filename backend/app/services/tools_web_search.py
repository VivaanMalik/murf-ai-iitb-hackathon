import os
import re
from tavily import TavilyClient
from dotenv import load_dotenv

load_dotenv()
tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))    


def search_general_web(query):
    """
    Searches the live web using Tavily.
    Returns a summary of the top 3 results.
    """
    try:
        # 'search_depth="advanced"' gives better answers for research
        result = list(tavily.search(query=query, search_depth="advanced", max_results=1).get('results', []))[0]
        
        output = f"Source: {result['title']}\nContent: {result['content']}"
        
        return output
    except Exception as e:
        return f"Web Search Error: {e}"
    
def search_patents(query):
    """
    Searches Google Patents via Tavily by filtering domains.
    """
    print(f"📜 Searching Patents: {query}")
    try:
        response = tavily.search(
            query=query,
            search_depth="advanced",
            include_domains=["patents.google.com"],
            max_results=1
        )
        
        results_list = list(response.get('results', []))
        
        # 1. Safety Check: Handle 0 results
        if not results_list:
            return "No patents found."
            
        result = results_list[0]
        
        # 2. Clean ONLY the summary content
        raw_content = result['content']
        lines = raw_content.split('\n')
        clean_lines = []
        
        for line in lines:
            line = line.strip()
            
            # --- Cleaning Filters ---
            if line.startswith("|") or " | " in line: continue
            if line.startswith("##") or line.startswith("[...]") or line == "Links": continue
            if line in ["USPTO", "Espacenet", "Global Dossier", "Discuss", "Abstract", "Info", "Classifications"]: continue
            
            # Metadata filter (e.g. "Publication number:")
            if ":" in line and len(line.split(":")[0]) < 25:
                continue
                
            # Patent ID filter (e.g. "US2007...")
            if re.match(r'^[A-Z]{2}\d+[A-Z]\d+$', line):
                continue

            if len(line) > 10: 
                clean_lines.append(line)

        cleaned_summary = "".join(clean_lines)
        cleaned_summary = re.sub(r'\s+', ' ', cleaned_summary).strip()
        
        # 3. Construct Final Output (Title + Clean Summary)
        # We add the title NOW so it doesn't get filtered out above
        output = f"Patent: {result['title']}\nSummary: {cleaned_summary}"
            
        return output

    except Exception as e:
        return f"Patent Search Error: {e}"
