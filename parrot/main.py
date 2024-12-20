import logging

from parrot.bot import AbstractParrot


def main() -> None:
	logging.info("Initializing bot...")
	bot = AbstractParrot()
	bot.go()


if __name__ == "__main__":
	main()
