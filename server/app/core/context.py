from typing import Dict, Any, Optional

class ExecutionContext:
    """
    The short-term memory for the SpecTest agent during a test run.
    Manages session state, authentication tokens, and variables captured from responses.
    """
    
    def __init__(self, base_url: str):
        self.base_url: str = base_url.rstrip("/")
        self.auth_tokens: Dict[str, str] = {}  # endpoint mapping or global token
        self.captured_vars: Dict[str, Any] = {}
        self.global_token: Optional[str] = None

    def set_global_auth(self, token: str):
        """Sets a bearer token to be used globally."""
        self.global_token = token

    def set_endpoint_auth(self, endpoint: str, token: str):
        """Sets an authentication token for a specific endpoint."""
        self.auth_tokens[endpoint] = token

    def get_auth_header(self, endpoint: Optional[str] = None) -> Dict[str, str]:
        """
        Returns the appropriate Authorization header.
        Prioritizes endpoint-specific tokens over global tokens.
        """
        token = self.auth_tokens.get(endpoint) if endpoint else None
        if not token:
            token = self.global_token
            
        if token:
            return {"Authorization": f"Bearer {token}"}
        return {}

    def save_variable(self, key: str, value: Any):
        """Saves a variable for use in future steps (e.g., user_id)."""
        self.captured_vars[key] = value

    def get_variable(self, key: str, default: Any = None) -> Any:
        """Retrieves a previously saved variable."""
        return self.captured_vars.get(key, default)

    def get_all_context(self) -> Dict[str, Any]:
        """Returns a snapshot of the current context for diagnostic logging."""
        return {
            "base_url": self.base_url,
            "captured_vars": self.captured_vars,
            "has_global_token": self.global_token is not None,
            "endpoint_specific_tokens": list(self.auth_tokens.keys())
        }
