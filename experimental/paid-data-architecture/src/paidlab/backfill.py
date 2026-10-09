"""Provider-neutral backfill cost guard."""
from dataclasses import dataclass

@dataclass(frozen=True)
class BackfillRequest:
    symbol: str
    start: str
    end: str
    dataset: str
    dry_run: bool = True

@dataclass(frozen=True)
class CostEstimate:
    records: int | None = None
    bytes: int | None = None
    currency: str = "USD"
    amount: float | None = None

class CostGuard:
    def __init__(self, max_amount: float | None = None, max_bytes: int | None = None):
        self.max_amount = max_amount
        self.max_bytes = max_bytes

    def approve(self, estimate: CostEstimate) -> tuple[bool, str]:
        if self.max_amount is not None and estimate.amount is not None and estimate.amount > self.max_amount:
            return False, f"estimated cost {estimate.amount} exceeds limit {self.max_amount}"
        if self.max_bytes is not None and estimate.bytes is not None and estimate.bytes > self.max_bytes:
            return False, f"estimated bytes {estimate.bytes} exceeds limit {self.max_bytes}"
        return True, "within configured limits"
