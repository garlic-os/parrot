import logging

from parrot.bot import Parrot


def main() -> None:
	logging.info("Initializing bot...")
	bot = Parrot()
	bot.go()


if __name__ == "__main__":
	main()
