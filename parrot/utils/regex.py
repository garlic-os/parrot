import re


markdown = re.compile(r"[*_`~]")
discord_string_start = re.compile(r"[<@:]")
do_not_capitalize = re.compile(r"(^<.*>$)|(^.+:\/\/.+$)")
snowflake = re.compile(r"[^0-9]")
