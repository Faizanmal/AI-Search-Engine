import sys
import os
import traceback
import asyncio
# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from api.rag_pipeline import RAGPipeline

try:
    p = RAGPipeline()
    print('RAGPipeline instantiated')
    res = asyncio.run(p.process_query('test query'))
    print('Result:', res)
except Exception:
    print('Exception during process_query:')
    traceback.print_exc()
