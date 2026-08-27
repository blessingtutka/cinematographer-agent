"""Custom exception classes for the AI agent pipeline."""


class GeminiError(Exception):
    """Raised when the Gemini API returns an error or is unreachable.

    Maps to HTTP 502 Bad Gateway at the router level.
    """

    def __init__(self, message: str = "Gemini API returned an error") -> None:
        super().__init__(message)
        self.message = message


class InternalProcessingError(Exception):
    """Raised when a non-Gemini internal processing step fails after a
    successful Gemini response (e.g., Pydantic validation failure).

    Maps to HTTP 500 Internal Server Error at the router level.
    """

    def __init__(self, message: str = "Internal processing error") -> None:
        super().__init__(message)
        self.message = message


class ShotPlanValidationError(InternalProcessingError):
    """Raised when the ShotPlan fails Pydantic validation after all retry
    attempts are exhausted.
    """

    def __init__(
        self, message: str = "ShotPlan validation failed after all attempts"
    ) -> None:
        super().__init__(message)
        
class InvalidDroneAssignmentError(ValueError):
    """Raised when a generated Shot references a drone name not present in
    the provided drone_inventory. Caught alongside ValidationError in the
    retry loop — see module docstring."""
