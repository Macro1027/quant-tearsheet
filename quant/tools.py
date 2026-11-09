import pandas as pd

def date_to_str(stamp) -> str:
        return pd.Timestamp(stamp).strftime("%Y-%m-%d")