import logging

class ColorFormatter(logging.Formatter):
    COLORS = {
        "DEBUG": "\033[94m",    # Bright blue
        "INFO": "\033[92m",     # Green
        "WARNING": "\033[93m",  # Yellow
        "ERROR": "\033[91m",    # Red
        "CRITICAL": "\033[41m", # Red background
    }
    RESET = "\033[0m"

    def format(self, record):
        color = self.COLORS.get(record.levelname, self.RESET)
        record.levelname = f"{color}{record.levelname}{self.RESET}"
        return super().format(record)

def setup_and_get_logger(module_name) -> logging.Logger:
    logger = logging.getLogger(module_name)
    if logger.hasHandlers():
        logger.handlers.clear()

    formatter = ColorFormatter(
        '[%(asctime)s] %(levelname)s in %(module)s : %(message)s',
        datefmt='%d/%b/%Y %H:%M:%S'
    )
    handler = logging.StreamHandler()
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

    return logger