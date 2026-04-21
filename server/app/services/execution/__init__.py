"""
Execution engine.

Will contain:
- sequential executor
- dependency resolver (extract token/id and inject into subsequent requests)
- self-healing retry logic
- persistence of per-test results + progress events
"""

