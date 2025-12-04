import math
import re
import io
import numpy as np
from contextlib import redirect_stdout

def execute_safe_python(code: str) -> str:            
    code = re.sub(r'^\s*import\s+math\s*$', '', code, flags=re.MULTILINE | re.IGNORECASE)
    
    code = re.sub(r'^\s*import\s+numpy\s+as\s+np\s*$', '', code, flags=re.MULTILINE | re.IGNORECASE)
    code = re.sub(r'^\s*import\s+numpy\s*$', '', code, flags=re.MULTILINE | re.IGNORECASE)
    
    code = re.sub(r'\n{2,}', '\n', code).strip()
    
    allowed_modules = {
        'math': math,
        'np': np,       # Whitelisting NumPy
        'numpy': np     # Allowing both 'np' and 'numpy' access
    }

    restricted_builtins = __builtins__.copy()
    if isinstance(restricted_builtins, dict):
        restricted_builtins.pop('__import__', None)
        restricted_builtins.pop('open', None)
        restricted_builtins.pop('exit', None)
        restricted_builtins.pop('quit', None)

    sandbox_globals = {
        **allowed_modules,
        '__builtins__': restricted_builtins,
        'result': None
    }

    output_buffer = io.StringIO()
    
    try:
        with redirect_stdout(output_buffer):
            # The 'result' variable must be explicitly set by the user's code 
            # for the final answer.
            exec(code, sandbox_globals)
        
        # Check for the final result or captured print output
        final_result = sandbox_globals.get('result')
        captured_output = output_buffer.getvalue().strip()
        
        if final_result is not None:
            return f"{final_result}"
        elif captured_output:
            return f"{captured_output}"
        else:
            return "Code executed, but no explicit 'result' variable was set and no output was printed."

    except Exception as e:
        return f"Code execution failed due to an error: {type(e).__name__}: {str(e)}"
    
