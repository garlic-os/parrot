import logging

from parrot.bot import Parrot


def main() -> None:
	logging.info("Initializing bot...")
	bot = Parrot()
	bot.commence()


if __name__ == "__main__":
	main()