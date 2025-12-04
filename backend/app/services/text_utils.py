import re
from num2words import num2words
from urllib.parse import urlparse

def url_to_text(text: str) -> str:
    URL_PATTERN = re.compile(r'(https?://\S+|www\.\S+)', re.IGNORECASE)
    def url_to_spoken(url: str) -> str:
        if not url.startswith(('http://', 'https://')):
            url = 'http://' + url

        parsed = urlparse(url)

        host = parsed.netloc or parsed.path
        host = host.replace('www.', '')

        spoken_host = host.replace('.', ' dot ').replace('-', ' dash ')

        return f"link to {spoken_host}"
    
    def replace(match):
        url = match.group(0)
        return url_to_spoken(url)

    return URL_PATTERN.sub(replace, text)

def smart_split(text: str):
    lines = []
    curr_line = ""
    math_mode = False

    for i, char in enumerate(text):
        curr_line+=char

        if char == '$':
            if i+1<len(text) and text[i+1]=='$':
                math_mode = not math_mode
            math_mode = not math_mode
        
        if char == '\n' and not math_mode:
            lines.append(curr_line.strip())
            curr_line = ""
            continue

        if (char in ['.', '!', '?', ':', ';'] and not math_mode):
            # Check if next char is space or end of string (avoid splitting 3.14)
            if i + 1 < len(text) and text[i+1] == ' ':
                lines.append(curr_line.strip())
                curr_line = ""
            elif i + 1 == len(text):
                lines.append(curr_line.strip())
                curr_line = ""
        elif (char == ' ' and len(curr_line)>50 and not math_mode):
            lines.append(curr_line.strip())
            curr_line = ""

    if curr_line.strip():
        lines.append(curr_line.strip())

    return lines

def process_speech(text: str) -> str:
    text = text.replace("```", "")
    text = latex_to_speech(text)
    text = url_to_text(text)
    text = numbers_to_words(text)

    return text

def numbers_to_words(text: str) -> str:
    """Find numbers in a text and convert them."""
    DIGIT_WORD = {
        '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
        '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine'
    }

    def digits_to_words(s):
        """Convert each digit (and decimal point) to its word."""
        string = ""
        for idx, char in enumerate(s):
            string+=char
            if (idx+1)%3==0:
                string+=','
        return " ".join((DIGIT_WORD.get(ch, "point") if ch!=',' else ',') for ch in string)

    def is_big_number(num_str):
        """Define what counts as a BIG/ID-like number."""
        # Remove sign
        s = num_str.lstrip("+-")
        
        # Leading zeros -> treat as big
        if len(s) > 1 and s[0] == "0":
            return True
        
        # Decimal places rule
        if "." in s:
            integer, fractional = s.split(".", 1)
            if len(fractional) > 4:
                return True
        
        # Digit count rule
        digits_only = s.replace(".", "")
        if digits_only.isdigit() and len(digits_only) > 9:
            return True
        
        return False

    def convert_number(num_str):
        """Convert a single number according to rules."""
        if is_big_number(num_str):
            return digits_to_words(num_str)
        else:
            # normal spoken words
            try:
                if "." in num_str:
                    # handle decimals manually
                    left, right = num_str.split(".")
                    left_words = num2words(int(left))
                    right_words = " ".join(DIGIT_WORD[d] for d in right)
                    return f"{left_words} point {right_words}"
                else:
                    return num2words(int(num_str))
            except:
                # fallback — treat as digits
                return digits_to_words(num_str)
        
    pattern = r"\d+(?:\.\d+)?"
    
    def repl(match):
        return convert_number(match.group())
    
    out = re.sub(pattern, repl, text)
    print(out)
    return out

def latex_to_speech(text: str) -> str:
    """
    Finds LaTeX inside $...$ and converts ONLY that part to spoken English.
    Example: "The value of $x^2$ is 4." -> "The value of x to the power of 2 is 4."
    """

    # --- INTERNAL HELPER: Converts raw LaTeX to Speech ---
    def _convert_math_string(math_text):
        # 1. Complex Structures
        math_text = re.sub(r'\\int_\{(.+?)\}\^\{(.+?)\}', r'integral from \1 to \2', math_text)
        math_text = re.sub(r'\\sum_\{(.+?)\}\^\{(.+?)\}', r'sum from \1 to \2', math_text)
        math_text = re.sub(r'\\lim_\{(.+?) \\to (.+?)\}', r'limit as \1 approaches \2', math_text)
        
        # Fractions (Run twice for nesting)
        for _ in range(2):
            math_text = re.sub(r'\\frac\{(.+?)\}\{(.+?)\}', r' \1 over \2 ', math_text)

        math_text = re.sub(r'\\sqrt\{(.+?)\}', r'square root of \1', math_text)

        # 2. Calculus & Powers
        math_text = re.sub(r'\^\{(.+?)\}', r' to the power of \1', math_text)
        math_text = re.sub(r'\^([0-9a-zA-Z])', r' to the power of \1', math_text)
        math_text = re.sub(r'_\{(.+?)\}', r' sub \1', math_text)
        
        # 3. Symbol Replacement Table
        replacements = {
            "\\alpha": "alpha", "\\beta": "beta", "\\theta": "theta", "\\pi": "pi",
            "\\infty": "infinity", "\\approx": "approximately", "\\neq": "is not equal to",
            "\\leq": "is less than or equal to", "\\geq": "is greater than or equal to",
            "\\pm": "plus or minus", "\\cdot": "times", "\\times": "times",
            "=": " equals ", "+": " plus ", "-": " minus ", "/": " over "
        }
        
        for latex, spoken in replacements.items():
            math_text = math_text.replace(latex, " " + spoken + " ")

        # 4. Cleanup
        math_text = math_text.replace("\\", "")
        math_text = math_text.replace("{", "").replace("}", "")
        return math_text.strip()

    # --- MAIN LOGIC: Regex Callback ---
    # Finds pattern $...$ and runs _convert_math_string on the content
    def replace_callback(match):
        content = match.group(1) # The text INSIDE the $ signs
        spoken_version = _convert_math_string(content)
        return spoken_version

    # Replace all occurrences of $...$ using the callback
    # The 'r' prefix and flags aren't strictly needed here but good practice
    processed_text = re.sub(r'\$(.*?)\$', replace_callback, text)
    
    return processed_text