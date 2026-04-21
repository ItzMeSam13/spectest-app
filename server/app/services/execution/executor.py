"""
Sequential executor.

Will contain:
- run loop that executes TestCases in order
- updates DB per test attempt (real-time)
- uses SharedContext for dependency chaining
"""

