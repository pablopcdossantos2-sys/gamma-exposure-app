"""Minimal ingestion pipeline connecting adapters, normalized storage and research hooks."""
from dataclasses import is_dataclass
from .models import OptionTrade
from .flow import classify_trade

class ResearchPipeline:
    def __init__(self, provider, store=None, session="session"):
        self.provider = provider
        self.store = store
        self.session = session

    def run_options_once(self):
        out = []
        self.provider.connect()
        try:
            for event in self.provider.stream_option_events():
                if self.store is not None:
                    self.store.append(self.provider.capabilities.provider_id, "options", self.session, event)
                if isinstance(event, OptionTrade):
                    out.append(classify_trade(event))
                else:
                    out.append(event)
        finally:
            self.provider.close()
        return out
